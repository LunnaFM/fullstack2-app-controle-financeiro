# Controle Financeiro — Projeto 2 (Programação Web Full Stack)

Aplicação full stack de controle financeiro pessoal: o usuário se cadastra, faz login e registra entradas e saídas por categoria e fonte/destino, com relatórios e previsão de faturas de cartão de crédito.

## Tecnologias

| Camada | Tecnologias |
|---|---|
| Back-end | Node.js 20+ (recomendado 22), Express 5, MySQL 8 (driver `mysql2` com pool), `bcrypt`, `jsonwebtoken`, `dotenv`, `cors`, `express-rate-limit`, `nodemon` (dev) |
| Front-end | React + Vite (Parte 3) |
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
├── frontend/                 → SPA React (Parte 3)
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
| GET, POST | `/api/categorias` | Lista / cria categorias | Parte 2 |
| PUT, DELETE | `/api/categorias/:id` | Edita / exclui categoria | Parte 2 |
| GET, POST | `/api/fontes-destinos` | Lista / cria fontes e destinos | Parte 2 |
| PUT, DELETE | `/api/fontes-destinos/:id` | Edita / exclui fonte/destino | Parte 2 |
| GET | `/api/lancamentos?inicio=&fim=&tipo=&categoriaId=&fonteDestinoId=&pagina=` | Lista com filtros e paginação | Parte 2 |
| POST | `/api/lancamentos` | Cria lançamento (com parcelas, se houver) | Parte 2 |
| GET, PUT, DELETE | `/api/lancamentos/:id` | Detalha / edita / exclui (`?todasParcelas=true`) | Parte 2 |
| GET | `/api/relatorios/categorias?inicio=&fim=` | Relatório por categoria (RF7) | — |
| GET | `/api/relatorios/fontes-destinos?inicio=&fim=` | Relatório por fonte/destino (RF8) | — |
| GET | `/api/relatorios/faturas?meses=3` | Previsão de faturas (RF9) | — |

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

### Padrão de erro

Todas as respostas de erro têm o mesmo formato; `campos` só aparece em erros de campo:

```json
{
  "erro": "Dados inválidos.",
  "campos": { "cpf": "CPF inválido." }
}
```

## Para quem continua o projeto

**Back-end (Parte 2)**

- Proteger cada recurso registrando o middleware antes do Router, em `server.js`:
  `app.use('/api/categorias', autenticar, categoriasRoutes);`
- O id do usuário logado está em `req.usuarioId` (vem do token). Toda consulta filtra por `usuario_id = ?` com esse valor, nunca com id vindo do corpo ou da URL.
- Para erros esperados, lance `new ErroApi(status, mensagem, campos)` (de `middlewares/erros.js`); o middleware de erros monta a resposta no padrão. No Express 5, erros em rotas `async` chegam ao middleware sem precisar de `try/catch`.
- Para transações (parcelas), use `pool.getConnection()` e o mesmo padrão de `Usuario.cadastrar`.
- Os lançamentos de 3 meses do seed vão no final de `database/seed.sql`.

**Front-end (Parte 3)**

- Login devolve `token` e `usuario`; enviar `Authorization: Bearer <token>` em todas as requisições protegidas.
- Qualquer `401` em rota protegida significa token ausente, inválido ou expirado: fazer logout e voltar ao login.
- Em `400` e `409`, as mensagens de cada campo estão em `campos` (ex.: `campos.cpf`).
- A API aceita requisições da origem definida em `CORS_ORIGIN` (padrão `http://localhost:5173`).

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
