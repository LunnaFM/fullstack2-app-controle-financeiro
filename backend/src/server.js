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

// Públicas: cadastro e login. (/api/auth/me é protegida dentro do próprio arquivo.)
app.use('/api/auth', authRoutes);

// Protegidas: registrar com o middleware autenticar antes do Router, por exemplo:
// app.use('/api/categorias', autenticar, categoriasRoutes);
// app.use('/api/fontes-destinos', autenticar, fontesDestinosRoutes);
// app.use('/api/lancamentos', autenticar, lancamentosRoutes);
// app.use('/api/relatorios', autenticar, relatoriosRoutes);

// ---------------------------------------------------------------------------

app.use(rotaNaoEncontrada);
app.use(tratarErros);

app.listen(porta, () => {
  console.log(`API do controle financeiro rodando em http://localhost:${porta}`);
});
