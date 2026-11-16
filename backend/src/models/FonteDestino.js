const pool = require('../config/database');
const v = require('./financeiroValidacoes');
const { ErroApi } = require('../middlewares/erros');

const COL = 'id, usuario_id, nome, tipo, dia_fechamento, dia_vencimento, limite';

async function listar(usuarioId) {
  const [rows] = await pool.execute(
    `SELECT ${COL}
     FROM fontes_destinos
     WHERE usuario_id = ?
     ORDER BY nome`,
    [usuarioId]
  );

  return rows;
}

async function obter(usuarioId, registroId, conn = pool) {
  const [rows] = await conn.execute(
    `SELECT ${COL}
     FROM fontes_destinos
     WHERE usuario_id = ? AND id = ?`,
    [usuarioId, registroId]
  );

  return rows[0] || null;
}

function campos(body) {
  const nome = v.texto(body.nome, 'nome', 60);

  const tipo = v.escolha(
    body.tipo,
    'tipo',
    ['renda', 'conta', 'cartao_credito']
  );

  if (tipo !== 'cartao_credito') {
    return [nome, tipo, null, null, null];
  }

  return [
    nome,
    tipo,
    v.inteiro(body.dia_fechamento, 'dia_fechamento', 1, 31),
    v.inteiro(body.dia_vencimento, 'dia_vencimento', 1, 31),
    v.moeda(v.centavos(body.limite, 'limite', true))
  ];
}

async function criar(usuarioId, body) {
  const c = campos(body);

  try {
    const [result] = await pool.execute(
      `INSERT INTO fontes_destinos
       (usuario_id, nome, tipo, dia_fechamento, dia_vencimento, limite)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [usuarioId, ...c]
    );

    return obter(usuarioId, result.insertId);
  } catch (e) {
    v.erroBanco(e);
  }
}

async function editar(usuarioId, registroId, body) {
  const atual = await obter(usuarioId, registroId);

  if (!atual) {
    v.naoEncontrado('Fonte/destino');
  }

  const c = campos(body);

  const [refs] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM lancamentos
     WHERE usuario_id = ? AND fonte_destino_id = ?`,
    [usuarioId, registroId]
  );

  if (refs[0].total && atual.tipo !== c[1]) {
    throw new ErroApi(
      409,
      'Não é permitido alterar o tipo de fonte/destino com lançamentos.'
    );
  }

  try {
    await pool.execute(
      `UPDATE fontes_destinos
       SET nome = ?, tipo = ?, dia_fechamento = ?,
           dia_vencimento = ?, limite = ?
       WHERE usuario_id = ? AND id = ?`,
      [...c, usuarioId, registroId]
    );

    return obter(usuarioId, registroId);
  } catch (e) {
    v.erroBanco(e);
  }
}

async function excluir(usuarioId, registroId) {
  if (!await obter(usuarioId, registroId)) {
    v.naoEncontrado('Fonte/destino');
  }

  const [refs] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM lancamentos
     WHERE usuario_id = ? AND fonte_destino_id = ?`,
    [usuarioId, registroId]
  );

  if (refs[0].total) {
    throw new ErroApi(
      409,
      'Fonte/destino possui lançamentos vinculados.'
    );
  }

  await pool.execute(
    `DELETE FROM fontes_destinos
     WHERE usuario_id = ? AND id = ?`,
    [usuarioId, registroId]
  );
}

module.exports = {
  listar,
  obter,
  criar,
  editar,
  excluir
};
