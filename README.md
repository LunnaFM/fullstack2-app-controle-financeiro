# Controle Financeiro — Projeto 2 (Programação Web Full Stack)

Aplicação full stack de controle financeiro pessoal: o usuário se cadastra, faz login e registra entradas e saídas por categoria e fonte/destino, com relatórios e previsão de faturas de cartão de crédito.

## Tecnologias

| Camada | Tecnologias |
|---|---|
| Back-end | Node.js 20+ (recomendado 22), Express 5, MySQL 8 (driver `mysql2` com pool), `bcrypt`, `jsonwebtoken`, `dotenv`, `cors`, `express-rate-limit`, `nodemon` (dev) |
| Front-end | React 19, React Router, Vite, Recharts (gráficos), Lucide React (ícones) |
| Testes | `node:test` (nativo do Node, sem biblioteca extra) |

Decisões do grupo:

- **Banco:** MySQL 8, o mesmo usado no material da disciplina (`mysql2`).
- **Módulos:** CommonJS (`require` / `module.exports`) no back-end, como nos capítulos de Express e banco de dados.
- **Funções utilitárias puras** (validação de CPF, e-mail e senha) ficam em `backend/src/models/validacoes.js`, por serem regras de negócio.

## Estrutura

```text
.
├── backend/
│   ├── package.json
│   ├── .env.example          → modelo das variáveis de ambiente
│   ├── database/
│   │   ├── schema.sql        → criação do banco e das tabelas
│   │   └── seed.sql          → dados de demonstração
│   ├── src/
│   │   ├── server.js         → cria o app Express, registra middlewares e rotas
│   │   ├── config/           → variáveis de ambiente e pool do banco
│   │   ├── middlewares/      → autenticação JWT, validação, rate limit, erros
│   │   ├── models/           → acesso ao banco (SQL) e regras de negócio
│   │   └── routes/           → rotas + controladores
│   └── tests/                → testes unitários
├── frontend/                 → SPA React (veja frontend/README.md)
└── README.md
```

## Como rodar o back-end

Pré-requisitos: Node.js 20 ou superior e MySQL 8.0.16 ou superior (necessário para as restrições `CHECK`).

```bash
cd backend

# 1. Dependências
npm install

# 2. Variáveis de ambiente
cp .env.example .env
# edite o .env com o usuário e a senha do seu MySQL e um JWT_SECRET longo

# 3. Banco: cria as tabelas (apaga as existentes) e carrega os dados de demonstração
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql

# 4. Sobe a API em http://localhost:3000
npm run dev      # com nodemon (reinicia ao salvar)
# ou: npm start

# Testes unitários
npm test
```

No Windows (PowerShell), use `Get-Content database/schema.sql | mysql -u root -p` no passo 3, ou rode os arquivos pelo MySQL Workbench.

## Como rodar o front-end

Com a API em execução e configurada para aceitar a origem do Vite:

```bash
cd frontend
npm install
npm run dev
```

O Vite mostra no terminal o endereço local da interface. Para validar a versão
de produção e as regras de lint:

```bash
cd frontend
npm run build
npm run lint
npm test
```

Veja o [README do front-end](frontend/README.md) para detalhes da estrutura.

### Variáveis de ambiente

| Variável | Descrição | Exemplo |
|---|---|---|
| `PORT` | Porta da API | `3000` |
| `DB_HOST`, `DB_PORT` | Servidor do MySQL | `localhost`, `3306` |
| `DB_USER`, `DB_PASSWORD` | Credenciais do MySQL | `root` |
| `DB_NAME` | Nome do banco | `controle_financeiro` |
| `JWT_SECRET` | Chave de assinatura dos tokens | frase longa e aleatória |
| `JWT_EXPIRES_IN` | Validade do token | `1h` |
| `CORS_ORIGIN` | Origem do front-end liberada no CORS | `http://localhost:5173` |

### Usuários de demonstração (seed)

| E-mail | CPF | Senha |
|---|---|---|
| `ana@exemplo.com` | 529.982.247-25 | `Senha123` |
| `bruno@exemplo.com` | 111.444.777-35 | `Senha123` |

## Rotas da API

Todas as rotas abaixo de `/api`, exceto cadastro e login, exigem o cabeçalho `Authorization: Bearer <token>`.

| Método | Rota | Descrição | Status |
|---|---|---|---|
| POST | `/api/auth/cadastro` | Cadastra usuário (cria categorias e fonte/destino padrão) | Pronta |
| POST | `/api/auth/login` | Autentica e devolve o JWT | Pronta |
| GET | `/api/auth/me` | Dados do usuário logado | Pronta |
| GET, POST | `/api/categorias` | Lista / cria categorias | Pronta |
| PUT, DELETE | `/api/categorias/:id` | Edita / exclui categoria (`409` se tiver lançamentos) | Pronta |
| GET, POST | `/api/fontes-destinos` | Lista / cria fontes e destinos | Pronta |
| PUT, DELETE | `/api/fontes-destinos/:id` | Edita / exclui fonte/destino (`409` se tiver lançamentos) | Pronta |
| GET | `/api/lancamentos?inicio=&fim=&tipo=&categoriaId=&fonteDestinoId=&busca=&pagina=&porPagina=` | Lista com filtros, paginação e totais (padrão: mês corrente) | Pronta |
| POST | `/api/lancamentos` | Cria lançamento (com parcelas, se houver) | Pronta |
| GET, PUT, DELETE | `/api/lancamentos/:id` | Detalha / edita / exclui (`?todasParcelas=true`) | Pronta |
| GET | `/api/relatorios/categorias?inicio=&fim=` | Relatório por categoria (RF7) | Pronta |
| GET | `/api/relatorios/fontes-destinos?inicio=&fim=` | Relatório por fonte/destino (RF8) | Pronta |
| GET | `/api/relatorios/faturas?meses=3` | Fatura aberta + próximas faturas de cada cartão (RF9) | Pronta |

### Autenticação

**`POST /api/auth/cadastro`**

```json
{ "nome": "Ana Souza", "email": "ana@exemplo.com", "cpf": "529.982.247-25", "senha": "Senha123", "confirmacaoSenha": "Senha123" }
```

- `201` → `{ "id": 1, "nome": "Ana Souza", "email": "ana@exemplo.com" }`
- `400` → campos obrigatórios, e-mail inválido, CPF com dígito verificador errado, senha fora da regra (8 a 72 caracteres, com letras e números) ou confirmação diferente (`confirmacaoSenha` é opcional para a API).
- `409` → e-mail ou CPF já cadastrado; `campos` indica qual.

O e-mail é gravado em minúsculas e sem espaços e o CPF só com dígitos, para que a restrição `UNIQUE` do banco trate `Ana@Exemplo.com` e `ana@exemplo.com` (ou `529.982.247-25` e `52998224725`) como o mesmo valor. A unicidade é garantida pelo banco, não por consulta prévia no código.

**`POST /api/auth/login`**

```json
{ "email": "ana@exemplo.com", "senha": "Senha123" }
```

- `200` → `{ "token": "<jwt>", "usuario": { "id": 1, "nome": "Ana Souza", "email": "ana@exemplo.com" } }`
- `401` → `{ "erro": "E-mail ou senha inválidos." }` (mesma mensagem para e-mail inexistente ou senha errada)
- `429` → mais de 10 tentativas com falha em 15 minutos, pelo mesmo IP

O token é assinado com `JWT_SECRET`, expira conforme `JWT_EXPIRES_IN` e guarda o id do usuário no campo padrão `sub`.

**`GET /api/auth/me`** (protegida)

- `200` → `{ "id": 1, "nome": "Ana Souza", "email": "ana@exemplo.com", "criado_em": "2026-11-16 10:00:00" }`
- `401` → token ausente, inválido ou expirado

### Relatórios

Os totais são calculados **no servidor**, com `GROUP BY` e `SUM` no MySQL (`backend/src/models/Relatorio.js`). Sem `inicio` e `fim`, o período é o mês corrente.

- **`/api/relatorios/categorias`** devolve, para saídas (`categorias`) e entradas (`entradas`), o total de cada categoria, o percentual sobre o total, o valor no **período anterior de mesmo tamanho** e a variação. Se o período for formado por meses completos (ex.: outubro), o anterior são os meses imediatamente anteriores (setembro); senão, o mesmo número de dias logo antes.
- **`/api/relatorios/fontes-destinos`** devolve entradas, saídas e, para fontes do tipo `conta`, o saldo (entradas − saídas) no período.
- **`/api/relatorios/faturas`** devolve, para cada cartão, a fatura **aberta** e as próximas `meses` faturas, com fechamento, vencimento, total e os lançamentos (com a parcela, ex.: `2/6`), além do **limite utilizado** (todas as parcelas ainda não vencidas) e do **limite disponível**.

**Regra de fechamento** (`backend/src/models/faturas.js`): compra **antes** do dia de fechamento entra na fatura que fecha no mesmo mês; **no dia do fechamento ou depois**, na do mês seguinte. Se o vencimento for maior que o fechamento, vence no mesmo mês; senão, no seguinte. Dias inexistentes (31 em fevereiro) viram o último dia do mês.

**Escolha de modelagem das parcelas:** cada parcela é gravada como um lançamento, com a data da compra somada de `k − 1` meses (parcela 1 na data da compra, parcela 2 um mês depois...). Assim a regra de fechamento é aplicada igualmente a qualquer lançamento, e os filtros por período da listagem mostram cada parcela no mês em que ela pesa no orçamento.

### Padrão de erro

Todas as respostas de erro têm o mesmo formato; `campos` só aparece em erros de campo:

```json
{
  "erro": "Dados inválidos.",
  "campos": { "cpf": "CPF inválido." }
}
```

## Front-end

SPA em React com uma rota por tela, todas protegidas (sem login, redireciona para `/login`):

| Rota | Tela |
|---|---|
| `/login`, `/cadastro` | Login e cadastro (erros do servidor aparecem no campo, ex.: CPF já cadastrado) |
| `/` | Visão geral do mês: entradas, saídas, saldo, fatura aberta, gráficos e lançamentos recentes |
| `/lancamentos` | Cadastro, edição e exclusão (pergunta "só esta parcela ou todas"), filtros, totais do período, paginação e exportação CSV |
| `/categorias`, `/fontes-destinos` | Cadastros |
| `/relatorios` | RF7 e RF8 com tabelas e gráficos |
| `/faturas` | RF9 por cartão, com limite utilizado e disponível |

Todas as chamadas passam por `frontend/src/services/api.js`, que envia o token e, ao receber `401`, faz logout e volta ao login. O `AuthContext` guarda usuário e token (no `localStorage`, para sobreviver ao recarregamento) e expõe `login`, `logout` e `cadastrar`.

## Testando pela linha de comando

```bash
# cadastro
curl -X POST http://localhost:3000/api/auth/cadastro -H "Content-Type: application/json" \
  -d '{"nome":"Carla Dias","email":"carla@exemplo.com","cpf":"390.533.447-05","senha":"Senha123"}'

# mesmo e-mail com maiúsculas → 409 (campo email)
curl -X POST http://localhost:3000/api/auth/cadastro -H "Content-Type: application/json" \
  -d '{"nome":"Carla Dias","email":"CARLA@exemplo.com","cpf":"868.912.240-04","senha":"Senha123"}'

# mesmo CPF sem pontuação → 409 (campo cpf)
curl -X POST http://localhost:3000/api/auth/cadastro -H "Content-Type: application/json" \
  -d '{"nome":"Carla Dias","email":"carla2@exemplo.com","cpf":"39053344705","senha":"Senha123"}'

# login
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"ana@exemplo.com","senha":"Senha123"}'

# rota protegida sem token → 401
curl http://localhost:3000/api/auth/me

# rota protegida com token → 200
curl http://localhost:3000/api/auth/me -H "Authorization: Bearer <token>"
```
