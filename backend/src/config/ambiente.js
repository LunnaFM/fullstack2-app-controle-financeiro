// Carrega o .env e centraliza a leitura das variáveis de ambiente.
// Os demais arquivos importam daqui, em vez de ler process.env espalhado pelo código.
const path = require('path');

require('dotenv').config({
  path: path.resolve(__dirname, '../../.env'),
  quiet: true,
});

const obrigatorias = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET'];
const faltando = obrigatorias.filter((nome) => !process.env[nome]);

if (faltando.length > 0) {
  console.error(`Variáveis de ambiente ausentes: ${faltando.join(', ')}. Confira o arquivo .env.`);
  process.exit(1);
}

module.exports = {
  porta: Number(process.env.PORT) || 3000,
  corsOrigem: process.env.CORS_ORIGIN || 'http://localhost:5173',
  banco: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
  },
  jwt: {
    segredo: process.env.JWT_SECRET,
    expiraEm: process.env.JWT_EXPIRES_IN || '1h',
  },
};
