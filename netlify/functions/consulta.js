const { getStore } = require('@netlify/blobs');
// build: usa BLOBS_TOKEN + BLOBS_SITE_ID (config manual) — 2026-10-29

const HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

function round2(v) { return Math.round((v || 0) * 100) / 100; }

function mesRefDe(f) { return f.mesReferencia || f.mes; }

// Mesmo histórico de consumo usado no gráfico do Demonstrativo (PDF): combina os
// lançamentos completos de Contas com o histórico só-de-consumo importado das
// contas Copel (historicoConsumo), que cobre meses mais antigos sem lançamento
// completo — dá um gráfico mais longo que usar só faturamento.
function historicoClienteConsumo(data, clienteId, mesRefAtual) {
  const porMes = {};
  for (const h of (data.historicoConsumo || [])) {
    if (h.clienteId === clienteId && h.mesReferencia <= mesRefAtual) porMes[h.mesReferencia] = h.consumoKwh;
  }
  for (const f of (data.faturamento || [])) {
    if (f.clienteId === clienteId && mesRefDe(f) <= mesRefAtual && (f.consumoKwh || 0) > 0) {
      porMes[mesRefDe(f)] = f.consumoKwh;
    }
  }
  return Object.keys(porMes).sort().slice(-12).map((mesReferencia) => ({ mesReferencia, consumoKwh: porMes[mesReferencia] }));
}

function fatorEmissao(config) { return (config && config.fatorEmissaoCO2) || 0.1134; }

// Mesma fórmula usada no app (calcularFatura) — nunca inclui valorConcessionaria,
// só o que o cliente paga e economiza.
function calcularFatura(f, cliente, config) {
  const tarifaConsumo = f.tarifaConsumo || config.tarifaConsumo || 0;
  const tarifaSistema = f.tarifaUsoSistema || config.tarifaUsoSistema || 0;
  const tarifaCombinada = tarifaConsumo + tarifaSistema;
  const desconto = cliente ? (cliente.percentualDesconto || 0) : 0;
  const iluminacao = cliente ? (cliente.iluminacaoPublica || 0) : 0;
  const bandeira = f.bandeira || 0;
  const consumo = f.consumoKwh || 0;
  const semDesconto = tarifaCombinada * consumo + iluminacao + bandeira;
  const comDesconto = tarifaCombinada * (1 - desconto) * consumo + iluminacao + bandeira;
  return { tarifaCombinada, iluminacao, bandeira, semDesconto, comDesconto, economia: semDesconto - comDesconto };
}

// Economia e CO2 acumulados no ano corrente (mesma lógica do app: soma desde
// janeiro, ou desde a base registrada em economiaBaseAno do cliente, se houver).
function acumuladoAno(faturamento, clienteId, mesRefAtual, cliente, config) {
  const ano = mesRefAtual.split('-')[0];
  const base = cliente && cliente.economiaBaseAno;
  const desde = (base && base.mesReferencia && base.mesReferencia.startsWith(ano + '-')) ? base.mesReferencia : null;
  const rows = faturamento.filter((f) => f.clienteId === clienteId && mesRefDe(f).startsWith(ano + '-') && mesRefDe(f) <= mesRefAtual && (!desde || mesRefDe(f) > desde));
  let economia = desde ? (base.economia || 0) : 0;
  let co2 = desde ? (base.co2 || 0) : 0;
  const fe = fatorEmissao(config);
  for (const f of rows) {
    economia += calcularFatura(f, cliente, config).economia;
    co2 += (f.consumoKwh || 0) * fe;
  }
  return { economia, co2 };
}

// Endpoint público, sem senha — mas só devolve dados do cliente cujo token
// (tokenConsulta) bater com o link que ele recebeu. As mesmas informações que
// já vão no Demonstrativo de Energia (PDF) que a cooperativa envia por e-mail:
// total a pagar, detalhamento da conta, economia e histórico de consumo. Nunca
// devolve valorConcessionaria nem qualquer figura interna de custo/lucro da
// cooperativa — isso não entra no Demonstrativo também.
exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'GET') {
      return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'Método não permitido.' }) };
    }

    const token = (event.queryStringParameters && event.queryStringParameters.t || '').trim();
    if (!token) {
      return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Link inválido.' }) };
    }

    const store = getStore({
      name: 'coop-solar',
      siteID: process.env.BLOBS_SITE_ID,
      token: process.env.BLOBS_TOKEN,
    });

    const data = await store.get('data', { type: 'json' });
    if (!data) {
      return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ error: 'Link inválido ou expirado.' }) };
    }

    const cliente = (data.clientes || []).find((c) => c.tokenConsulta === token);
    if (!cliente) {
      return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ error: 'Link inválido ou expirado.' }) };
    }

    const config = data.config || {};
    const faturasCliente = (data.faturamento || [])
      .filter((f) => f.clienteId === cliente.id)
      .sort((a, b) => b.mes.localeCompare(a.mes));

    const historico = faturasCliente.map((f) => ({
      mes: f.mes,
      mesReferencia: f.mesReferencia || null,
      vencimento: f.vencimento || null,
      consumoKwh: typeof f.consumoKwh === 'number' ? f.consumoKwh : null,
      valorCobrado: f.valorCobrado,
      pago: !!f.pago,
    }));

    const mesRefAtual = faturasCliente.length ? mesRefDe(faturasCliente[0]) : new Date().toISOString().slice(0, 7);
    const consumoHistorico = historicoClienteConsumo(data, cliente.id, mesRefAtual);

    let atual = null;
    if (faturasCliente.length) {
      const fAtual = faturasCliente[0];
      const calc = calcularFatura(fAtual, cliente, config);
      const mesRef = mesRefDe(fAtual);
      const acumulado = acumuladoAno(data.faturamento || [], cliente.id, mesRef, cliente, config);
      const co2Mes = (fAtual.consumoKwh || 0) * fatorEmissao(config);
      atual = {
        energiaComDesconto: round2(calc.tarifaCombinada * (1 - (cliente.percentualDesconto || 0)) * (fAtual.consumoKwh || 0)),
        iluminacaoPublica: round2(calc.iluminacao),
        bandeira: calc.bandeira > 0 ? round2(calc.bandeira) : 0,
        bandeiraNome: fAtual.bandeiraNome || null,
        semDesconto: round2(calc.semDesconto),
        comDesconto: round2(calc.comDesconto),
        economiaMes: round2(calc.economia),
        economiaAno: round2(acumulado.economia),
        co2Mes: Math.round(co2Mes * 10) / 10,
        co2Ano: Math.round(acumulado.co2 * 10) / 10,
      };
    }

    const resposta = {
      cliente: {
        nome: cliente.nome,
        endereco: cliente.endereco || '',
        uc: cliente.uc || '',
        diaVencimento: cliente.diaVencimento,
        status: cliente.status,
      },
      cooperativa: {
        nome: (data.config && data.config.nomeCooperativa) || 'Cooperativa Solar',
        pixChave: (data.config && data.config.pixChave) || '',
        pixContato: (data.config && data.config.pixContato) || '',
      },
      atual,
      historico,
      consumoHistorico,
    };

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify(resposta) };
  } catch (err) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: String((err && err.message) || err) }) };
  }
};
