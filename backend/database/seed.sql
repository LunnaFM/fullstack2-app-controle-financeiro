-- Carga inicial para testes e demonstração.
-- Rodar logo depois do schema.sql:  mysql -u root -p < database/seed.sql
--
-- Usuários de demonstração (senha de ambos: Senha123)
--   ana@exemplo.com    CPF 529.982.247-25
--   bruno@exemplo.com  CPF 111.444.777-35
-- O senha_hash abaixo foi gerado com bcrypt (custo 10), o mesmo usado no cadastro.

-- Garante que os acentos sejam lidos como UTF-8, mesmo que o cliente
-- do MySQL esteja configurado com outro conjunto de caracteres.
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

USE controle_financeiro;

-- ---------------------------------------------------------------------------
-- Usuários, com as mesmas categorias e fontes/destinos que o cadastro cria
-- ---------------------------------------------------------------------------

INSERT INTO usuarios (nome, email, cpf, senha_hash) VALUES
  ('Ana Souza', 'ana@exemplo.com', '52998224725',
   '$2b$10$wC.pCVvp73vAW0BcSNYrEeyqiI8rAkQxUuh/HbjaOEawOEaj9dGZa');
SET @ana = LAST_INSERT_ID();

INSERT INTO usuarios (nome, email, cpf, senha_hash) VALUES
  ('Bruno Lima', 'bruno@exemplo.com', '11144477735',
   '$2b$10$wC.pCVvp73vAW0BcSNYrEeyqiI8rAkQxUuh/HbjaOEawOEaj9dGZa');
SET @bruno = LAST_INSERT_ID();

INSERT INTO categorias (usuario_id, nome, tipo)
SELECT u.id, c.nome, c.tipo
  FROM usuarios u
  CROSS JOIN (
    SELECT 'Salário' AS nome, 'entrada' AS tipo UNION ALL
    SELECT 'Outras entradas', 'entrada' UNION ALL
    SELECT 'Alimentação', 'saida' UNION ALL
    SELECT 'Moradia', 'saida' UNION ALL
    SELECT 'Saúde', 'saida' UNION ALL
    SELECT 'Mobilidade', 'saida' UNION ALL
    SELECT 'Lazer', 'saida' UNION ALL
    SELECT 'Educação', 'saida' UNION ALL
    SELECT 'Outras saídas', 'saida'
  ) AS c
 WHERE u.id IN (@ana, @bruno);

INSERT INTO fontes_destinos (usuario_id, nome, tipo, dia_fechamento, dia_vencimento, limite) VALUES
  (@ana,   'Conta corrente', 'conta',          NULL, NULL, NULL),
  (@ana,   'Salário',        'renda',          NULL, NULL, NULL),
  (@ana,   'Cartão Nubank',  'cartao_credito', 3,    10,   3000.00),
  (@bruno, 'Conta corrente', 'conta',          NULL, NULL, NULL),
  (@bruno, 'Salário',        'renda',          NULL, NULL, NULL),
  (@bruno, 'Visa crédito',   'cartao_credito', 25,   5,    5000.00);

-- ---------------------------------------------------------------------------
-- Lançamentos (Parte 2): pelo menos 3 meses por usuário, incluindo
-- uma compra parcelada no cartão de crédito.
-- ---------------------------------------------------------------------------
