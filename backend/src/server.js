
const { porta, corsOrigem } = require('./config/ambiente');

const express = require('express');
const cors = require('cors');

const {
  rotaNaoEncontrada,
  tratarErros
} = require('./middlewares/erros');

const autenticar = require('./middlewares/autenticar');

const authRoutes = require('./routes/auth.routes');

const categoriaRoutes = require('./routes/categoria.routes');
const fonteDestinoRoutes = require('./routes/fonteDestino.routes');
const lancamentoRoutes = require('./routes/lancamento.routes');
const relatorioRoutes = require('./routes/relatorio.routes');

const app = express();

// Middlewares globais
app.use(cors({ origin: corsOrigem }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/categorias', autenticar, categoriaRoutes);

app.use(
  '/api/fontes-destinos',
  autenticar,
  fonteDestinoRoutes
);

app.use(
  '/api/lancamentos',
  autenticar,
  lancamentoRoutes
);

app.use(
  '/api/relatorios',
  autenticar,
  relatorioRoutes
);

// Tratamento de erros
app.use(rotaNaoEncontrada);
app.use(tratarErros);

// Inicialização do servidor
app.listen(porta, () => {
  console.log(
    `API do controle financeiro rodando em http://localhost:${porta}`
  );
});
