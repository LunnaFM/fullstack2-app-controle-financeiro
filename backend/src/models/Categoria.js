const pool = require('../config/database');
const v = require('./financeiroValidacoes');
const { ErroApi } = require('../middlewares/erros');

const COL = 'id, usuario_id, nome, tipo';

async function listar(usuarioId) {
  const [rows] = await pool.execute(
    `SELECT ${COL}
     FROM categorias
     WHERE usuario_id = ?
     ORDER BY tipo, nome`,
    [usuarioId]
  );

  return rows;
}

async function obter(usuarioId, categoriaId, conn = pool) {
  const [rows] = await conn.execute(
    `SELECT ${COL}
     FROM categorias
     WHERE usuario_id = ? AND id = ?`,
    [usuarioId, categoriaId]
  );

  return rows[0] || null;
}

async function criar(usuarioId, body) {
  const nome = v.texto(body.nome, 'nome', 60);
  const tipo = v.escolha(
    body.tipo,
    'tipo',
    ['entrada', 'saida']
  );

  try {
    const [result] = await pool.execute(
      `INSERT INTO categorias (usuario_id, nome, tipo)
       VALUES (?, ?, ?)`,
      [usuarioId, nome, tipo]
    );

    return obter(usuarioId, result.insertId);
  } catch (e) {
    v.erroBanco(e);
  }
}

async function editar(usuarioId, categoriaId, body) {
  const atual = await obter(usuarioId, categoriaId);

  if (!atual) {
    v.naoEncontrado('Categoria');
  }

  const nome = v.texto(body.nome, 'nome', 60);
  const tipo = v.escolha(
    body.tipo,
    'tipo',
    ['entrada', 'saida']
  );

  const [refs] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM lancamentos
     WHERE usuario_id = ? AND categoria_id = ?`,
    [usuarioId, categoriaId]
  );

  if (refs[0].total > 0 && atual.tipo !== tipo) {
    throw new ErroApi(
      409,
      'Não é permitido alterar o tipo de categoria com lançamentos.'
    );
  }

  try {
    await pool.execute(
      `UPDATE categorias
       SET nome = ?, tipo = ?
       WHERE usuario_id = ? AND id = ?`,
      [nome, tipo, usuarioId, categoriaId]
    );

    return obter(usuarioId, categoriaId);
  } catch (e) {
    v.erroBanco(e);
  }
}

async function excluir(usuarioId, categoriaId) {
  if (!await obter(usuarioId, categoriaId)) {
    v.naoEncontrado('Categoria');
  }

  const [refs] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM lancamentos
     WHERE usuario_id = ? AND categoria_id = ?`,
    [usuarioId, categoriaId]
  );

  if (refs[0].total) {
    throw new ErroApi(
      409,
      'Categoria possui lançamentos vinculados.'
    );
  }

  await pool.execute(
    `DELETE FROM categorias
     WHERE usuario_id = ? AND id = ?`,
    [usuarioId, categoriaId]
  );
}

module.exports = {
  listar,
  obter,
  criar,
  editar,
  excluir
};
