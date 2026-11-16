// Cria o app Express, registra os middlewares globais e as rotas da API.
const { porta, corsOrigem } = require('./config/ambiente');
const express = require('express');
const cors = require('cors');

const { rotaNaoEncontrada, tratarErros } = require('./middlewares/erros');
const authRoutes = require('./routes/auth.routes');

const app = express();

// CORS liberado apenas para a origem do front-end (definida no .env)
app.use(cors({ origin: corsOrigem }));
app.use(express.json());

// ---------------------------------------------------------------------------
// Rotas
// ---------------------------------------------------------------------------

// Públicas: cadastro e login
app.use('/api/auth', authRoutes);

// ---------------------------------------------------------------------------

app.use(rotaNaoEncontrada);
app.use(tratarErros);

app.listen(porta, () => {
  console.log(`API do controle financeiro rodando em http://localhost:${porta}`);
});
