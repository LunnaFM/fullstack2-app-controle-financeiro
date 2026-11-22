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

- **Visão Geral:** filtra totais e gráficos Recharts por mês, últimos três meses,
  ano ou todo o período, e compara entradas com saídas.
- **Lançamentos:** permite filtrar o histórico por fonte/destino e exportar os
  resultados filtrados em CSV.
- **Cartões e Faturas:** apresenta parcelas previstas por cartão e vencimento.

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
│   ├── App.jsx              # Rotas e proteção das páginas autenticadas
│   ├── components/
│   │   └── RelatorioGraficos.jsx # Gráficos de relatórios com Recharts
│   ├── main.jsx             # Inicialização do React
│   ├── contexts/
│   │   └── AuthContext.jsx  # Sessão, login e cadastro
│   ├── pages/
│   │   ├── Cadastro.jsx     # Formulário de cadastro
│   │   ├── Login.jsx        # Formulário de login
│   │   └── Painel.jsx       # Visão geral, lançamentos e faturas
│   └── services/
│       ├── api.js           # Cliente HTTP e envio do token de autenticação
│       ├── faturas.js       # Competências e valores das faturas de cartão
│       └── relatorios.js    # Períodos dos relatórios e serialização CSV
└── tests/
    ├── faturas.test.js      # Testes de fechamento e vencimento de faturas
    └── relatorios.test.js   # Testes de filtros de período e exportação CSV
```

As chamadas à API usam `http://localhost:3000/api`, definido em
`src/services/api.js`. O back-end deve permitir a origem usada pelo Vite em sua
configuração de CORS.
