// Acesso ao banco para a tabela usuarios.
// Todo SQL fica na camada models; as rotas só chamam estes métodos.
const pool = require('../config/database');

// Criadas para todo usuário novo, para que ele já possa lançar movimentações.
const CATEGORIAS_PADRAO = [
  ['Salário', 'entrada'],
  ['Outras entradas', 'entrada'],
  ['Alimentação', 'saida'],
  ['Moradia', 'saida'],
  ['Saúde', 'saida'],
  ['Mobilidade', 'saida'],
  ['Lazer', 'saida'],
  ['Educação', 'saida'],
  ['Outras saídas', 'saida'],
];

const FONTES_DESTINOS_PADRAO = [['Conta corrente', 'conta']];

// Colunas que podem sair para o cliente (senha_hash nunca entra aqui)
const COLUNAS_PUBLICAS = 'id, nome, email, criado_em';

class Usuario {
  // Cadastra o usuário e os itens padrão em uma única transação:
  // ou tudo é gravado, ou nada é (rollback).
  // Se o e-mail ou o CPF já existirem, o MySQL rejeita o INSERT com ER_DUP_ENTRY
  // e o erro sobe para a rota tratar.
  async cadastrar({ nome, email, cpf, senhaHash }) {
    const conexao = await pool.getConnection();
    try {
      await conexao.beginTransaction();

      const [resultado] = await conexao.execute(
        'INSERT INTO usuarios (nome, email, cpf, senha_hash) VALUES (?, ?, ?, ?)',
        [nome, email, cpf, senhaHash],
      );
      const usuarioId = resultado.insertId;

      // INSERT de várias linhas: "VALUES ?" recebe um array de arrays (só funciona com query)
      await conexao.query('INSERT INTO categorias (usuario_id, nome, tipo) VALUES ?', [
        CATEGORIAS_PADRAO.map(([nomeCategoria, tipo]) => [usuarioId, nomeCategoria, tipo]),
      ]);
      await conexao.query('INSERT INTO fontes_destinos (usuario_id, nome, tipo) VALUES ?', [
        FONTES_DESTINOS_PADRAO.map(([nomeFonte, tipo]) => [usuarioId, nomeFonte, tipo]),
      ]);

      await conexao.commit();
      return { id: usuarioId, nome, email };
    } catch (erro) {
      await conexao.rollback();
      throw erro;
    } finally {
      conexao.release(); // devolve a conexão ao pool
    }
  }

  // Usado só no login: é o único método que devolve o senha_hash.
  async buscarParaLogin(email) {
    const [linhas] = await pool.execute(
      'SELECT id, nome, email, senha_hash FROM usuarios WHERE email = ?',
      [email],
    );
    return linhas[0] ?? null;
  }

  async buscarPorId(id) {
    const [linhas] = await pool.execute(
      `SELECT ${COLUNAS_PUBLICAS} FROM usuarios WHERE id = ?`,
      [id],
    );
    return linhas[0] ?? null;
  }
}

module.exports = new Usuario();
