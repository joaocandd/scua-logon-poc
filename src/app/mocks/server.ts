// Entrada da API simulada que o interceptor carrega sob demanda: o banco, as fixtures e as rotas
// ficam fora do pacote inicial e só são baixados na primeira chamada a /api/...
export { MockDb } from './db';
export { handleApiRequest } from './handlers';
