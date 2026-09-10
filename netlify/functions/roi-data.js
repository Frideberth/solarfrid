const { getStore } = require('@netlify/blobs');

// Dados iniciais: histórico real extraído da planilha PAINEL RETORNO USINA SOLAR
// (aba ROI, tabela detalhada mês a mês) — jul/2024 a ago/2026.
const SEED_DATA = {
  config: {
    nomeUsina: 'Usina Solar - Sítio Santa Izabel',
    proprietario: 'Frideberth Conrado',
    endereco: 'Sítio Santa Izabel',
    empresaInstaladora: 'Fridvolt',
    dataInstalacao: '2024-06-01',
    valorInvestido: 227496.67,
  },
  lancamentos: [
    { id: 'seed-2024-07', mes: '2024-07', pagoBanco: 5559.74, arrecadadoClientes: 5559.74 },
    { id: 'seed-2024-08', mes: '2024-08', pagoBanco: 4509.94, arrecadadoClientes: 4336.16 },
    { id: 'seed-2024-09', mes: '2024-09', pagoBanco: 4550.82, arrecadadoClientes: 4375.47 },
    { id: 'seed-2024-10', mes: '2024-10', pagoBanco: 4342.78, arrecadadoClientes: 4175.45 },
    { id: 'seed-2024-11', mes: '2024-11', pagoBanco: 4628.42, arrecadadoClientes: 4450.09 },
    { id: 'seed-2024-12', mes: '2024-12', pagoBanco: 4241.73, arrecadadoClientes: 4078.30 },
    { id: 'seed-2025-01', mes: '2025-01', pagoBanco: 4344.06, arrecadadoClientes: 4176.70 },
    { id: 'seed-2025-02', mes: '2025-02', pagoBanco: 4503.18, arrecadadoClientes: 4329.69 },
    { id: 'seed-2025-03', mes: '2025-03', pagoBanco: 4187.39, arrecadadoClientes: 4026.07 },
    { id: 'seed-2025-04', mes: '2025-04', pagoBanco: 4225.53, arrecadadoClientes: 4062.73 },
    { id: 'seed-2025-05', mes: '2025-05', pagoBanco: 4262.26, arrecadadoClientes: 4098.05 },
    { id: 'seed-2025-06', mes: '2025-06', pagoBanco: 4354.03, arrecadadoClientes: 4186.28 },
    { id: 'seed-2025-07', mes: '2025-07', pagoBanco: 4164.45, arrecadadoClientes: 4004.00 },
    { id: 'seed-2025-08', mes: '2025-08', pagoBanco: 4254.07, arrecadadoClientes: 4090.17 },
    { id: 'seed-2025-09', mes: '2025-09', pagoBanco: 4232.30, arrecadadoClientes: 4069.24 },
    { id: 'seed-2025-10', mes: '2025-10', pagoBanco: 4156.95, arrecadadoClientes: 3996.79 },
    { id: 'seed-2025-11', mes: '2025-11', pagoBanco: 4294.57, arrecadadoClientes: 4129.11 },
    { id: 'seed-2025-12', mes: '2025-12', pagoBanco: 4010.51, arrecadadoClientes: 3855.99 },
    { id: 'seed-2026-01', mes: '2026-01', pagoBanco: 4145.23, arrecadadoClientes: 3985.83 },
    { id: 'seed-2026-02', mes: '2026-02', pagoBanco: 4275.84, arrecadadoClientes: 4111.10 },
    { id: 'seed-2026-03', mes: '2026-03', pagoBanco: 3851.52, arrecadadoClientes: 3703.13 },
    { id: 'seed-2026-04', mes: '2026-04', pagoBanco: 4030.57, arrecadadoClientes: 3875.28 },
    { id: 'seed-2026-05', mes: '2026-05', pagoBanco: 4009.50, arrecadadoClientes: 3855.03 },
    { id: 'seed-2026-06', mes: '2026-06', pagoBanco: 4036.39, arrecadadoClientes: 3880.87 },
    { id: 'seed-2026-07', mes: '2026-07', pagoBanco: 3967.38, arrecadadoClientes: 3814.52 },
    { id: 'seed-2026-08', mes: '2026-08', pagoBanco: 4085.96, arrecadadoClientes: 3928.54 },
  ],
};

const HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

exports.handler = async (event) => {
  try {
    const store = getStore('usina-solar-roi');

    if (event.httpMethod === 'GET') {
      let data = await store.get('data', { type: 'json' });
      if (!data) {
        data = SEED_DATA;
        await store.setJSON('data', data);
      }
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify(data) };
    }

    if (event.httpMethod === 'POST' || event.httpMethod === 'PUT') {
      const incoming = JSON.parse(event.body || '{}');
      if (!incoming || typeof incoming !== 'object' || !Array.isArray(incoming.lancamentos) || !incoming.config) {
        return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Formato de dados inválido.' }) };
      }
      await store.setJSON('data', incoming);
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify(incoming) };
    }

    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'Método não permitido.' }) };
  } catch (err) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: String(err && err.message || err) }) };
  }
};
