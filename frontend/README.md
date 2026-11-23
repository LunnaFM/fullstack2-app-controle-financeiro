# Front-end — Controle Financeiro

Interface web do sistema de controle financeiro, desenvolvida com React e Vite.
Ela consome a API do back-end para autenticação, categorias, fontes/destinos e
lançamentos.

## Pré-requisitos

- Node.js compatível com a versão do Vite instalada.
- API do back-end em execução em `http://localhost:3000`.

## Instalação e execução

Na raiz do repositório:

```bash
cd frontend
npm install
npm run dev
```

O Vite informa no terminal o endereço local da aplicação (normalmente
`http://localhost:5173`). Para autenticação e operações financeiras, configure e
inicie também o back-end conforme o [README principal](../README.md).

## Funcionalidades

- **Rotas protegidas** (React Router): visão geral, lançamentos, categorias,
  fontes/destinos, relatórios e faturas. Sem login, a aplicação volta para `/login`.
- **Visão geral:** resumo do mês, gráficos Recharts e previsão de faturas.
- **Lançamentos:** filtros e paginação feitos pela API, totais do período,
  exclusão de "apenas esta parcela" ou "todas as parcelas" e exportação em CSV.
- **Relatórios e faturas:** exibem os totais calculados no servidor
  (`/api/relatorios/...`), incluindo comparação com o período anterior e limite
  disponível do cartão.

## Verificação

```bash
npm run build
npm run lint
npm test
```

## Estrutura

```text
frontend/
├── src/
│   ├── App.jsx                     # Rotas e proteção das páginas autenticadas
│   ├── main.jsx                    # Inicialização do React
│   ├── components/
│   │   ├── Layout.jsx              # Barra superior e menu (NavLink) das telas logadas
│   │   ├── Estados.jsx             # Carregando, erro, lista vazia, avisos e erro de campo
│   │   ├── RelatorioGraficos.jsx   # Gráficos da visão geral (Recharts)
│   │   └── GraficosRelatorio.jsx   # Gráficos da tela de relatórios (Recharts)
│   ├── contexts/
│   │   └── AuthContext.jsx         # Sessão: usuário, token, login, logout e cadastro
│   ├── hooks/
│   │   └── useApi.js               # Carrega um endpoint com estados de carregamento/erro
│   ├── pages/
│   │   ├── Login.jsx, Cadastro.jsx
│   │   ├── Dashboard.jsx           # Visão geral do mês
│   │   ├── Lancamentos.jsx
│   │   ├── Categorias.jsx, FontesDestinos.jsx
│   │   ├── Relatorios.jsx          # RF7 e RF8
│   │   └── Faturas.jsx             # RF9
│   └── services/
│       ├── api.js                  # Cliente HTTP único: token e tratamento de 401
│       ├── formatacao.js           # Moeda, datas, períodos e máscara de CPF
│       └── relatorios.js           # Geração do CSV
└── tests/
    ├── formatacao.test.js
    └── relatorios.test.js
```

As chamadas à API usam `http://localhost:3000/api` (ou a variável `VITE_API_URL`),
definido em `src/services/api.js`. O back-end deve permitir a origem usada pelo Vite em sua
configuração de CORS.
