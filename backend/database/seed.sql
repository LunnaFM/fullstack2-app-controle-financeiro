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
  (@ana,   'Cartão Nubank',  'cartao_credito', 3,    10,   5000.00),
  (@bruno, 'Conta corrente', 'conta',          NULL, NULL, NULL),
  (@bruno, 'Salário',        'renda',          NULL, NULL, NULL),
  (@bruno, 'Visa crédito',   'cartao_credito', 25,   5,    5000.00);

-- ---------------------------------------------------------------------------
-- Lançamentos: setembro a novembro de 2026 para os dois usuários.
--
-- Cada linha da tabela "d" informa a categoria e a fonte/destino pelo NOME;
-- os JOINs trocam o nome pelo id do usuário certo.
--
-- Compras parceladas seguem a mesma regra da API: uma linha por parcela,
-- mesmo grupo_parcelamento, data da parcela k = data da compra + (k - 1) meses
-- e a diferença de centavos na primeira parcela.
--   Ana   → Notebook  R$ 2.400,00 em 6x no Cartão Nubank (fecha dia 3, vence dia 10)
--   Ana   → Fone      R$   250,00 em 3x, comprado NO DIA do fechamento (03/11):
--                     cai na fatura de dezembro, não na de novembro
--   Bruno → Geladeira R$ 3.600,00 em 4x no Visa crédito (fecha dia 25, vence dia 5)
-- ---------------------------------------------------------------------------

INSERT INTO lancamentos
  (usuario_id, tipo, descricao, valor, data, categoria_id, fonte_destino_id,
   parcela_atual, total_parcelas, grupo_parcelamento)
SELECT u.id, d.tipo, d.descricao, d.valor, d.data, c.id, f.id,
       d.parcela, d.total, d.grupo
  FROM (
    -- Ana: entradas
    SELECT 'ana@exemplo.com' AS email, 'entrada' AS tipo, 'Salário setembro' AS descricao,
           5000.00 AS valor, '2026-09-05' AS data, 'Salário' AS categoria, 'Salário' AS fonte,
           1 AS parcela, 1 AS total, NULL AS grupo UNION ALL
    SELECT 'ana@exemplo.com', 'entrada', 'Salário outubro',  5000.00, '2026-10-05', 'Salário', 'Salário', 1, 1, NULL UNION ALL
    SELECT 'ana@exemplo.com', 'entrada', 'Salário novembro', 5000.00, '2026-11-05', 'Salário', 'Salário', 1, 1, NULL UNION ALL
    SELECT 'ana@exemplo.com', 'entrada', 'Freelance site',    800.00, '2026-10-18', 'Outras entradas', 'Conta corrente', 1, 1, NULL UNION ALL
    -- Ana: saídas da conta corrente
    SELECT 'ana@exemplo.com', 'saida', 'Aluguel setembro', 1500.00, '2026-09-10', 'Moradia', 'Conta corrente', 1, 1, NULL UNION ALL
    SELECT 'ana@exemplo.com', 'saida', 'Aluguel outubro',  1500.00, '2026-10-10', 'Moradia', 'Conta corrente', 1, 1, NULL UNION ALL
    SELECT 'ana@exemplo.com', 'saida', 'Aluguel novembro', 1500.00, '2026-11-10', 'Moradia', 'Conta corrente', 1, 1, NULL UNION ALL
    SELECT 'ana@exemplo.com', 'saida', 'Farmácia',          89.90, '2026-09-22', 'Saúde', 'Conta corrente', 1, 1, NULL UNION ALL
    SELECT 'ana@exemplo.com', 'saida', 'Consulta',         250.00, '2026-11-12', 'Saúde', 'Conta corrente', 1, 1, NULL UNION ALL
    -- Ana: saídas no cartão
    SELECT 'ana@exemplo.com', 'saida', 'Mercado',          612.40, '2026-09-14', 'Alimentação', 'Cartão Nubank', 1, 1, NULL UNION ALL
    SELECT 'ana@exemplo.com', 'saida', 'Mercado',          587.15, '2026-10-13', 'Alimentação', 'Cartão Nubank', 1, 1, NULL UNION ALL
    SELECT 'ana@exemplo.com', 'saida', 'Mercado',          640.80, '2026-11-14', 'Alimentação', 'Cartão Nubank', 1, 1, NULL UNION ALL
    SELECT 'ana@exemplo.com', 'saida', 'Aplicativo de transporte', 74.30, '2026-09-26', 'Mobilidade', 'Cartão Nubank', 1, 1, NULL UNION ALL
    SELECT 'ana@exemplo.com', 'saida', 'Aplicativo de transporte', 96.50, '2026-10-27', 'Mobilidade', 'Cartão Nubank', 1, 1, NULL UNION ALL
    SELECT 'ana@exemplo.com', 'saida', 'Aplicativo de transporte', 58.20, '2026-11-08', 'Mobilidade', 'Cartão Nubank', 1, 1, NULL UNION ALL
    SELECT 'ana@exemplo.com', 'saida', 'Cinema',            60.00, '2026-10-02', 'Lazer', 'Cartão Nubank', 1, 1, NULL UNION ALL
    SELECT 'ana@exemplo.com', 'saida', 'Show',             180.00, '2026-11-02', 'Lazer', 'Cartão Nubank', 1, 1, NULL UNION ALL
    -- Ana: Notebook R$ 2.400,00 em 6x
    SELECT 'ana@exemplo.com', 'saida', 'Notebook', 400.00, '2026-10-20', 'Educação', 'Cartão Nubank', 1, 6, '8f6b2c1e-4a7d-4e3b-9c5a-1d2e3f4a5b60' UNION ALL
    SELECT 'ana@exemplo.com', 'saida', 'Notebook', 400.00, '2026-11-20', 'Educação', 'Cartão Nubank', 2, 6, '8f6b2c1e-4a7d-4e3b-9c5a-1d2e3f4a5b60' UNION ALL
    SELECT 'ana@exemplo.com', 'saida', 'Notebook', 400.00, '2026-12-20', 'Educação', 'Cartão Nubank', 3, 6, '8f6b2c1e-4a7d-4e3b-9c5a-1d2e3f4a5b60' UNION ALL
    SELECT 'ana@exemplo.com', 'saida', 'Notebook', 400.00, '2027-01-20', 'Educação', 'Cartão Nubank', 4, 6, '8f6b2c1e-4a7d-4e3b-9c5a-1d2e3f4a5b60' UNION ALL
    SELECT 'ana@exemplo.com', 'saida', 'Notebook', 400.00, '2027-02-20', 'Educação', 'Cartão Nubank', 5, 6, '8f6b2c1e-4a7d-4e3b-9c5a-1d2e3f4a5b60' UNION ALL
    SELECT 'ana@exemplo.com', 'saida', 'Notebook', 400.00, '2027-03-20', 'Educação', 'Cartão Nubank', 6, 6, '8f6b2c1e-4a7d-4e3b-9c5a-1d2e3f4a5b60' UNION ALL
    -- Ana: Fone R$ 250,00 em 3x (83,34 + 83,33 + 83,33)
    SELECT 'ana@exemplo.com', 'saida', 'Fone de ouvido', 83.34, '2026-11-03', 'Lazer', 'Cartão Nubank', 1, 3, '2c9e7a4b-8d1f-4b6a-a3c2-5e6f7a8b9c01' UNION ALL
    SELECT 'ana@exemplo.com', 'saida', 'Fone de ouvido', 83.33, '2026-12-03', 'Lazer', 'Cartão Nubank', 2, 3, '2c9e7a4b-8d1f-4b6a-a3c2-5e6f7a8b9c01' UNION ALL
    SELECT 'ana@exemplo.com', 'saida', 'Fone de ouvido', 83.33, '2027-01-03', 'Lazer', 'Cartão Nubank', 3, 3, '2c9e7a4b-8d1f-4b6a-a3c2-5e6f7a8b9c01' UNION ALL

    -- Bruno: entradas
    SELECT 'bruno@exemplo.com', 'entrada', 'Salário setembro', 4200.00, '2026-09-05', 'Salário', 'Salário', 1, 1, NULL UNION ALL
    SELECT 'bruno@exemplo.com', 'entrada', 'Salário outubro',  4200.00, '2026-10-05', 'Salário', 'Salário', 1, 1, NULL UNION ALL
    SELECT 'bruno@exemplo.com', 'entrada', 'Salário novembro', 4200.00, '2026-11-05', 'Salário', 'Salário', 1, 1, NULL UNION ALL
    -- Bruno: saídas
    SELECT 'bruno@exemplo.com', 'saida', 'Aluguel setembro', 1200.00, '2026-09-08', 'Moradia', 'Conta corrente', 1, 1, NULL UNION ALL
    SELECT 'bruno@exemplo.com', 'saida', 'Aluguel outubro',  1200.00, '2026-10-08', 'Moradia', 'Conta corrente', 1, 1, NULL UNION ALL
    SELECT 'bruno@exemplo.com', 'saida', 'Aluguel novembro', 1200.00, '2026-11-08', 'Moradia', 'Conta corrente', 1, 1, NULL UNION ALL
    SELECT 'bruno@exemplo.com', 'saida', 'Curso de inglês',   320.00, '2026-09-15', 'Educação', 'Conta corrente', 1, 1, NULL UNION ALL
    SELECT 'bruno@exemplo.com', 'saida', 'Curso de inglês',   320.00, '2026-10-15', 'Educação', 'Conta corrente', 1, 1, NULL UNION ALL
    SELECT 'bruno@exemplo.com', 'saida', 'Curso de inglês',   320.00, '2026-11-15', 'Educação', 'Conta corrente', 1, 1, NULL UNION ALL
    SELECT 'bruno@exemplo.com', 'saida', 'Mercado',           702.60, '2026-09-20', 'Alimentação', 'Visa crédito', 1, 1, NULL UNION ALL
    SELECT 'bruno@exemplo.com', 'saida', 'Mercado',           655.90, '2026-10-19', 'Alimentação', 'Visa crédito', 1, 1, NULL UNION ALL
    SELECT 'bruno@exemplo.com', 'saida', 'Mercado',           731.25, '2026-11-21', 'Alimentação', 'Visa crédito', 1, 1, NULL UNION ALL
    SELECT 'bruno@exemplo.com', 'saida', 'Combustível',       210.00, '2026-10-30', 'Mobilidade', 'Visa crédito', 1, 1, NULL UNION ALL
    -- Bruno: Geladeira R$ 3.600,00 em 4x
    SELECT 'bruno@exemplo.com', 'saida', 'Geladeira', 900.00, '2026-09-28', 'Moradia', 'Visa crédito', 1, 4, '5d4c3b2a-1f0e-4d9c-8b7a-6f5e4d3c2b10' UNION ALL
    SELECT 'bruno@exemplo.com', 'saida', 'Geladeira', 900.00, '2026-10-28', 'Moradia', 'Visa crédito', 2, 4, '5d4c3b2a-1f0e-4d9c-8b7a-6f5e4d3c2b10' UNION ALL
    SELECT 'bruno@exemplo.com', 'saida', 'Geladeira', 900.00, '2026-11-28', 'Moradia', 'Visa crédito', 3, 4, '5d4c3b2a-1f0e-4d9c-8b7a-6f5e4d3c2b10' UNION ALL
    SELECT 'bruno@exemplo.com', 'saida', 'Geladeira', 900.00, '2026-12-28', 'Moradia', 'Visa crédito', 4, 4, '5d4c3b2a-1f0e-4d9c-8b7a-6f5e4d3c2b10'
  ) AS d
  JOIN usuarios        u ON u.email = d.email
  JOIN categorias      c ON c.usuario_id = u.id AND c.nome = d.categoria AND c.tipo = d.tipo
  JOIN fontes_destinos f ON f.usuario_id = u.id AND f.nome = d.fonte;
