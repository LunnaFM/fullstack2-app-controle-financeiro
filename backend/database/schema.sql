-- Criação do banco e das tabelas do controle financeiro (MySQL 8.0.16+).
-- Uso: mysql -u root -p < database/schema.sql
-- ATENÇÃO: o script apaga as tabelas existentes antes de recriá-las.

CREATE DATABASE IF NOT EXISTS controle_financeiro
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE controle_financeiro;

DROP TABLE IF EXISTS lancamentos;
DROP TABLE IF EXISTS fontes_destinos;
DROP TABLE IF EXISTS categorias;
DROP TABLE IF EXISTS usuarios;

-- Usuários: e-mail e CPF únicos garantidos pelo banco (UNIQUE),
-- e não só por uma consulta prévia no código.
CREATE TABLE usuarios (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  nome        VARCHAR(120) NOT NULL,
  email       VARCHAR(160) NOT NULL,                -- gravado em minúsculas
  cpf         CHAR(11)     NOT NULL,                -- gravado só com dígitos
  senha_hash  VARCHAR(100) NOT NULL,                -- hash bcrypt, nunca a senha
  criado_em   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_usuarios_email UNIQUE (email),
  CONSTRAINT uq_usuarios_cpf   UNIQUE (cpf)
);

CREATE TABLE categorias (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id  INT          NOT NULL,
  nome        VARCHAR(60)  NOT NULL,
  tipo        ENUM('entrada', 'saida') NOT NULL,
  CONSTRAINT uq_categorias_nome UNIQUE (usuario_id, nome, tipo),
  CONSTRAINT fk_categorias_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE fontes_destinos (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id      INT          NOT NULL,
  nome            VARCHAR(60)  NOT NULL,
  tipo            ENUM('renda', 'conta', 'cartao_credito') NOT NULL,
  dia_fechamento  TINYINT      NULL,
  dia_vencimento  TINYINT      NULL,
  limite          DECIMAL(12, 2) NULL,
  CONSTRAINT uq_fontes_destinos_nome UNIQUE (usuario_id, nome),
  CONSTRAINT ck_fontes_destinos_dias CHECK (
    (dia_fechamento IS NULL OR dia_fechamento BETWEEN 1 AND 31) AND
    (dia_vencimento IS NULL OR dia_vencimento BETWEEN 1 AND 31)
  ),
  CONSTRAINT ck_fontes_destinos_cartao CHECK (
    tipo <> 'cartao_credito' OR
    (dia_fechamento IS NOT NULL AND dia_vencimento IS NOT NULL AND limite IS NOT NULL)
  ),
  CONSTRAINT ck_fontes_destinos_limite CHECK (limite IS NULL OR limite >= 0),
  CONSTRAINT fk_fontes_destinos_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE lancamentos (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id          INT            NOT NULL,
  tipo                ENUM('entrada', 'saida') NOT NULL,
  descricao           VARCHAR(120)   NOT NULL,
  valor               DECIMAL(12, 2) NOT NULL,       -- dinheiro não é FLOAT
  data                DATE           NOT NULL,
  categoria_id        INT            NOT NULL,
  fonte_destino_id    INT            NOT NULL,
  parcela_atual       TINYINT        NOT NULL DEFAULT 1,
  total_parcelas      TINYINT        NOT NULL DEFAULT 1,
  grupo_parcelamento  CHAR(36)       NULL,           -- UUID igual em todas as parcelas da compra
  criado_em           DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_lancamentos_valor    CHECK (valor > 0),
  CONSTRAINT ck_lancamentos_parcelas CHECK (
    total_parcelas BETWEEN 1 AND 48 AND parcela_atual BETWEEN 1 AND total_parcelas
  ),
  CONSTRAINT fk_lancamentos_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_lancamentos_categoria FOREIGN KEY (categoria_id)
    REFERENCES categorias(id),
  CONSTRAINT fk_lancamentos_fonte_destino FOREIGN KEY (fonte_destino_id)
    REFERENCES fontes_destinos(id),
  INDEX idx_lancamentos_usuario_data (usuario_id, data),
  INDEX idx_lancamentos_grupo (grupo_parcelamento)
);
