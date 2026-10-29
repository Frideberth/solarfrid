const { getStore } = require('@netlify/blobs');

// Dados iniciais extraídos da planilha PAINEL RETORNO USINA SOLAR:
// - clientes e faturamento de set/2026 (aba "PAINEL SETEMBRO 2026")
// - histórico financeiro (pago no banco / lucro dos clientes) jul/2024 a ago/2026 (aba "ROI")
// Usados apenas se ainda não houver nenhum dado salvo no servidor (primeira execução).
const SEED_DATA = {
  config: {
    nomeCooperativa: 'Cooperativa Solar - Sítio Santa Izabel',
    proprietario: 'Frideberth Conrado',
    endereco: 'Sítio Santa Izabel',
    empresaInstaladora: 'Fridvolt',
    dataInstalacao: '2024-06-01',
    potenciaUsina: 8000,
    valorInvestido: 227496.67,
    tarifaConsumo: 0.375099,
    tarifaUsoSistema: 0.498807,
  },
  clientes: [
    { id: 'c1', nome: 'BEIRA LINHA LOJA', endereco: '', uc: '14208440', diaVencimento: 5, percentualDesconto: 0.20, iluminacaoPublica: 0, status: 'ativo' },
    { id: 'c2', nome: 'BEIRA LINHA CASA', endereco: '', uc: '14207656', diaVencimento: 5, percentualDesconto: 0.20, iluminacaoPublica: 0, status: 'ativo' },
    { id: 'c3', nome: 'LIDIANE', endereco: '', uc: '14220776', diaVencimento: 5, percentualDesconto: 0.15, iluminacaoPublica: 0, status: 'ativo' },
    { id: 'c4', nome: 'FRID', endereco: '', uc: '14220830', diaVencimento: 5, percentualDesconto: 0.20, iluminacaoPublica: 35.60, status: 'ativo' },
    { id: 'c5', nome: 'NARENA', endereco: '', uc: '113112009', diaVencimento: 7, percentualDesconto: 0.15, iluminacaoPublica: 0, status: 'ativo' },
    { id: 'c6', nome: 'RUI BANCO DO BRASIL', endereco: '', uc: '81564732', diaVencimento: 9, percentualDesconto: 0.15, iluminacaoPublica: 0, status: 'ativo' },
    { id: 'c7', nome: 'MARCELO', endereco: '', uc: '87551004', diaVencimento: 9, percentualDesconto: 0.15, iluminacaoPublica: 0, status: 'ativo' },
    { id: 'c8', nome: 'HELIO', endereco: '', uc: '14218283', diaVencimento: 13, percentualDesconto: 0.15, iluminacaoPublica: 0, status: 'ativo' },
    { id: 'c9', nome: 'ORLANDO', endereco: '', uc: '37657321', diaVencimento: 16, percentualDesconto: 0.20, iluminacaoPublica: 0, status: 'ativo' },
    { id: 'c10', nome: 'SITIO SANTA IZABEL', endereco: '', uc: '14565870', diaVencimento: 20, percentualDesconto: 0.15, iluminacaoPublica: 0, status: 'ativo' },
    { id: 'c11', nome: 'USINA SOLAR', endereco: '', uc: '102979553', diaVencimento: 25, percentualDesconto: 0.15, iluminacaoPublica: 0, status: 'ativo' },
  ],
  faturamento: [
    { id: 'f-2026-09-c1', clienteId: 'c1', mes: '2026-09', consumoKwh: 0, bandeira: 0, valorCobrado: 945.79, valorConcessionaria: 359.00, pago: false },
    { id: 'f-2026-09-c2', clienteId: 'c2', mes: '2026-09', consumoKwh: 0, bandeira: 0, valorCobrado: 246.80, valorConcessionaria: 150.96, pago: false },
    { id: 'f-2026-09-c3', clienteId: 'c3', mes: '2026-09', consumoKwh: 0, bandeira: 0, valorCobrado: 346.40, valorConcessionaria: 137.08, pago: false },
    { id: 'f-2026-09-c4', clienteId: 'c4', mes: '2026-09', consumoKwh: 868, bandeira: 107.24, valorCobrado: 749.68, valorConcessionaria: 258.13, pago: false },
    { id: 'f-2026-09-c5', clienteId: 'c5', mes: '2026-09', consumoKwh: 0, bandeira: 0, valorCobrado: 607.86, valorConcessionaria: 241.42, pago: false },
    { id: 'f-2026-09-c6', clienteId: 'c6', mes: '2026-09', consumoKwh: 0, bandeira: 0, valorCobrado: 276.78, valorConcessionaria: 103.21, pago: false },
    { id: 'f-2026-09-c7', clienteId: 'c7', mes: '2026-09', consumoKwh: 0, bandeira: 0, valorCobrado: 384.78, valorConcessionaria: 364.08, pago: false },
    { id: 'f-2026-09-c8', clienteId: 'c8', mes: '2026-09', consumoKwh: 0, bandeira: 0, valorCobrado: 314.07, valorConcessionaria: 157.29, pago: false },
    { id: 'f-2026-09-c9', clienteId: 'c9', mes: '2026-09', consumoKwh: 0, bandeira: 0, valorCobrado: 0, valorConcessionaria: 0, pago: false },
    { id: 'f-2026-09-c10', clienteId: 'c10', mes: '2026-09', consumoKwh: 0, bandeira: 0, valorCobrado: 585.90, valorConcessionaria: 226.57, pago: false },
    { id: 'f-2026-09-c11', clienteId: 'c11', mes: '2026-09', consumoKwh: 0, bandeira: 0, valorCobrado: 87.56, valorConcessionaria: 87.56, pago: false },
  ],
  financeiro: [
    { id: 'h-2024-07', mes: '2024-07', pagoBanco: 5559.74, arrecadadoClientes: 0 },
    { id: 'h-2024-08', mes: '2024-08', pagoBanco: 4336.16, arrecadadoClientes: 0 },
    { id: 'h-2024-09', mes: '2024-09', pagoBanco: 4375.47, arrecadadoClientes: 642.62 },
    { id: 'h-2024-10', mes: '2024-10', pagoBanco: 4175.45, arrecadadoClientes: 1499.09 },
    { id: 'h-2024-11', mes: '2024-11', pagoBanco: 4450.09, arrecadadoClientes: 1750.45 },
    { id: 'h-2024-12', mes: '2024-12', pagoBanco: 4078.30, arrecadadoClientes: 2709.12 },
    { id: 'h-2025-01', mes: '2025-01', pagoBanco: 4176.70, arrecadadoClientes: 2508.07 },
    { id: 'h-2025-02', mes: '2025-02', pagoBanco: 4329.69, arrecadadoClientes: 2934.84 },
    { id: 'h-2025-03', mes: '2025-03', pagoBanco: 4026.07, arrecadadoClientes: 2413.07 },
    { id: 'h-2025-04', mes: '2025-04', pagoBanco: 4062.73, arrecadadoClientes: 2094.97 },
    { id: 'h-2025-05', mes: '2025-05', pagoBanco: 4098.05, arrecadadoClientes: 3773.55 },
    { id: 'h-2025-06', mes: '2025-06', pagoBanco: 4186.28, arrecadadoClientes: 1719.73 },
    { id: 'h-2025-07', mes: '2025-07', pagoBanco: 4004.00, arrecadadoClientes: 3387.74 },
    { id: 'h-2025-08', mes: '2025-08', pagoBanco: 4090.17, arrecadadoClientes: 2428.06 },
    { id: 'h-2025-09', mes: '2025-09', pagoBanco: 4069.24, arrecadadoClientes: 2896.99 },
    { id: 'h-2025-10', mes: '2025-10', pagoBanco: 3996.79, arrecadadoClientes: 3671.21 },
    { id: 'h-2025-11', mes: '2025-11', pagoBanco: 4129.11, arrecadadoClientes: 3797.73 },
    { id: 'h-2025-12', mes: '2025-12', pagoBanco: 3855.99, arrecadadoClientes: 3994.15 },
    { id: 'h-2026-01', mes: '2026-01', pagoBanco: 3985.83, arrecadadoClientes: 4041.70 },
    { id: 'h-2026-02', mes: '2026-02', pagoBanco: 4111.10, arrecadadoClientes: 4588.22 },
    { id: 'h-2026-03', mes: '2026-03', pagoBanco: 3703.13, arrecadadoClientes: 4655.27 },
    { id: 'h-2026-04', mes: '2026-04', pagoBanco: 3875.28, arrecadadoClientes: 3240.90 },
    { id: 'h-2026-05', mes: '2026-05', pagoBanco: 3855.03, arrecadadoClientes: 3371.41 },
    { id: 'h-2026-06', mes: '2026-06', pagoBanco: 3880.87, arrecadadoClientes: 2892.17 },
    { id: 'h-2026-07', mes: '2026-07', pagoBanco: 3814.52, arrecadadoClientes: 2917.11 },
    { id: 'h-2026-08', mes: '2026-08', pagoBanco: 3928.54, arrecadadoClientes: 2568.28 },
  ],
};

const HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

// Chave compartilhada que o painel (index.html) precisa enviar no cabeçalho
// 'x-api-key' para ler ou salvar os dados. Configure a variável de ambiente
// COOP_API_KEY no Netlify (Site settings > Environment variables).
// Se a variável não estiver configurada, o acesso fica liberado sem senha
// (para não travar o site antes de você configurá-la) — configure-a assim
// que possível.
function autorizado(event) {
  const chave = process.env.COOP_API_KEY;
  if (!chave) return true;
  const headers = event.headers || {};
  const recebida = headers['x-api-key'] || headers['X-Api-Key'] || headers['X-API-KEY'];
  return recebida === chave;
}

exports.handler = async (event) => {
  try {
    if (!autorizado(event)) {
      return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ error: 'Senha de acesso inválida ou não informada.' }) };
    }

    const store = getStore('coop-solar');

    if (event.httpMethod === 'GET') {
      let data = await store.get('data', { type: 'json' });
      if (!data) {
        data = { ...SEED_DATA, _rev: 1 };
        await store.setJSON('data', data);
      }
      if (typeof data._rev !== 'number') data._rev = 1;
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify(data) };
    }

    if (event.httpMethod === 'POST' || event.httpMethod === 'PUT') {
      const incoming = JSON.parse(event.body || '{}');
      const ok = incoming && typeof incoming === 'object'
        && Array.isArray(incoming.clientes)
        && Array.isArray(incoming.faturamento)
        && Array.isArray(incoming.financeiro)
        && incoming.config;
      if (!ok) {
        return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Formato de dados inválido.' }) };
      }

      // Trava otimista: só aceita a gravação se o _rev enviado for o mesmo
      // que está salvo agora — evita que uma aba aberta há tempo sobrescreva
      // silenciosamente uma edição mais recente feita em outra aba/sessão.
      let atual = await store.get('data', { type: 'json' });
      if (!atual) atual = { ...SEED_DATA, _rev: 1 };
      if (typeof atual._rev !== 'number') atual._rev = 1;

      if (typeof incoming._rev === 'number' && incoming._rev !== atual._rev) {
        return {
          statusCode: 409,
          headers: HEADERS,
          body: JSON.stringify({
            error: 'Os dados foram atualizados por outra sessão desde que esta página carregou. Recarregue a página (F5) para ver a versão mais recente antes de salvar.',
            _rev: atual._rev,
          }),
        };
      }

      incoming._rev = atual._rev + 1;
      await store.setJSON('data', incoming);
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify(incoming) };
    }

    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'Método não permitido.' }) };
  } catch (err) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: String((err && err.message) || err) }) };
  }
};
