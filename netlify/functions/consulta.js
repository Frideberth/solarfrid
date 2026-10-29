const { getStore } = require('@netlify/blobs');

const HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

// Endpoint público, sem senha — mas só devolve dados do cliente cujo token
// (tokenConsulta) bater com o link que ele recebeu. Nunca devolve dados de
// outros clientes, nem valorConcessionaria/tarifas/bandeira (figuras internas
// da cooperativa) — só o que o próprio cliente precisa ver: débitos e consumo.
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

    const historico = (data.faturamento || [])
      .filter((f) => f.clienteId === cliente.id)
      .map((f) => ({
        mes: f.mes,
        mesReferencia: f.mesReferencia || null,
        vencimento: f.vencimento || null,
        consumoKwh: typeof f.consumoKwh === 'number' ? f.consumoKwh : null,
        saldoScee: typeof f.saldoScee === 'number' ? f.saldoScee : null,
        valorCobrado: f.valorCobrado,
        pago: !!f.pago,
      }))
      .sort((a, b) => b.mes.localeCompare(a.mes));

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
      historico,
    };

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify(resposta) };
  } catch (err) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: String((err && err.message) || err) }) };
  }
};
