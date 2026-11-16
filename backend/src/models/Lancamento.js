
const { randomUUID } = require('node:crypto');
const pool = require('../config/database');
const v = require('./financeiroValidacoes');
const { ErroApi } = require('../middlewares/erros');
const Categoria = require('./Categoria');
const FonteDestino = require('./FonteDestino');

const COL = `
  id, usuario_id, tipo, descricao, valor, data,
  categoria_id, fonte_destino_id, parcela_atual,
  total_parcelas, grupo_parcelamento, criado_em
`;

async function obter(usuarioId, lancamentoId, conn = pool) {
  const [rows] = await conn.execute(
    `SELECT ${COL}
     FROM lancamentos
     WHERE usuario_id = ? AND id = ?`,
    [usuarioId, lancamentoId]
  );

  return rows[0] || null;
}

function dados(body) {
  return {
    tipo: v.escolha(
      body.tipo,
      'tipo',
      ['entrada', 'saida']
    ),
    descricao: v.texto(body.descricao, 'descricao', 120),
    valor: v.centavos(body.valor),
    data: v.data(body.data),
    categoriaId: v.id(
      body.categoria_id ?? body.categoriaId,
      'categoria_id'
    ),
    fonteId: v.id(
      body.fonte_destino_id ?? body.fonteDestinoId,
      'fonte_destino_id'
    ),
    parcelas: v.inteiro(
      body.total_parcelas ?? body.totalParcelas ?? 1,
      'total_parcelas',
      1,
      48
    )
  };
}

async function relacionamentos(usuarioId, d, conn = pool) {
  const categoria = await Categoria.obter(
    usuarioId,
    d.categoriaId,
    conn
  );

  if (!categoria) {
    v.falha(
      'categoria_id',
      'Categoria inexistente ou de outro usuário.'
    );
  }

  if (categoria.tipo !== d.tipo) {
    v.falha(
      'categoria_id',
      'Tipo da categoria incompatível com o lançamento.'
    );
  }

  const fonte = await FonteDestino.obter(
    usuarioId,
    d.fonteId,
    conn
  );

  if (!fonte) {
    v.falha(
      'fonte_destino_id',
      'Fonte/destino inexistente ou de outro usuário.'
    );
  }

  if (
    d.parcelas > 1 &&
    (d.tipo !== 'saida' || fonte.tipo !== 'cartao_credito')
  ) {
    v.falha(
      'total_parcelas',
      'Parcelamento exige saída em cartão de crédito.'
    );
  }

  return fonte;
}

async function listar(usuarioId, q) {
  const where = ['usuario_id = ?'];
  const args = [usuarioId];

  if (q.inicio) {
    where.push('data >= ?');
    args.push(v.data(q.inicio, 'inicio'));
  }

  if (q.fim) {
    where.push('data <= ?');
    args.push(v.data(q.fim, 'fim'));
  }

  if (q.inicio && q.fim && q.inicio > q.fim) {
    v.falha(
      'fim',
      'A data final deve ser igual ou posterior à inicial.'
    );
  }

  if (q.tipo) {
    where.push('tipo = ?');
    args.push(
      v.escolha(q.tipo, 'tipo', ['entrada', 'saida'])
    );
  }

  if (q.categoriaId || q.categoria_id) {
    where.push('categoria_id = ?');
    args.push(
      v.id(
        q.categoriaId ?? q.categoria_id,
        'categoriaId'
      )
    );
  }

  if (q.fonteDestinoId || q.fonte_destino_id) {
    where.push('fonte_destino_id = ?');
    args.push(
      v.id(
        q.fonteDestinoId ?? q.fonte_destino_id,
        'fonteDestinoId'
      )
    );
  }

  const pagina = v.inteiro(
    q.pagina ?? 1,
    'pagina',
    1,
    1000000
  );

  const porPagina = v.inteiro(
    q.porPagina ?? 20,
    'porPagina',
    1,
    100
  );

  const filtro = where.join(' AND ');

  const [totais] = await pool.execute(
    `SELECT tipo, COUNT(*) AS quantidade,
            SUM(valor) AS total
     FROM lancamentos
     WHERE ${filtro}
     GROUP BY tipo`,
    args
  );

  const [contagem] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM lancamentos
     WHERE ${filtro}`,
    args
  );

  // Valores de paginação já validados como inteiros.
  const offset = (pagina - 1) * porPagina;

  const [rows] = await pool.execute(
    `SELECT ${COL}
     FROM lancamentos
     WHERE ${filtro}
     ORDER BY data DESC, id DESC
     LIMIT ${porPagina} OFFSET ${offset}`,
    args
  );

  const entradas =
    totais.find(x => x.tipo === 'entrada')?.total ?? '0.00';

  const saidas =
    totais.find(x => x.tipo === 'saida')?.total ?? '0.00';

  const converter = valor =>
    v.centavos(String(valor), 'total', true);

  const saldoCentavos =
    converter(entradas) - converter(saidas);

  return {
    dados: rows,
    pagina,
    porPagina,
    total: contagem[0].total,
    totais: {
      entradas: String(entradas),
      saidas: String(saidas),
      saldo:
        `${saldoCentavos < 0 ? '-' : ''}` +
        v.moeda(Math.abs(saldoCentavos))
    }
  };
}

async function criar(usuarioId, body) {
  const d = dados(body);

  await relacionamentos(usuarioId, d);

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    await relacionamentos(usuarioId, d, conn);

    const base = Math.floor(d.valor / d.parcelas);
    const resto = d.valor % d.parcelas;

    const grupo =
      d.parcelas > 1 ? randomUUID() : null;

    const ids = [];

    for (let i = 0; i < d.parcelas; i++) {
      const valor = v.moeda(
        base + (i === 0 ? resto : 0)
      );

      const dataParcela = v.adicionarMeses(d.data, i);

      const [result] = await conn.execute(
        `INSERT INTO lancamentos (
          usuario_id, tipo, descricao, valor, data,
          categoria_id, fonte_destino_id, parcela_atual,
          total_parcelas, grupo_parcelamento
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          usuarioId,
          d.tipo,
          d.descricao,
          valor,
          dataParcela,
          d.categoriaId,
          d.fonteId,
          i + 1,
          d.parcelas,
          grupo
        ]
      );

      ids.push(result.insertId);
    }

    await conn.commit();

    return {
      grupo_parcelamento: grupo,
      total_parcelas: d.parcelas,
      ids,
      valores: ids.map((_, i) =>
        v.moeda(base + (i === 0 ? resto : 0))
      )
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function editar(usuarioId, lancamentoId, body) {
  const atual = await obter(usuarioId, lancamentoId);

  if (!atual) {
    v.naoEncontrado('Lançamento');
  }

  if (atual.total_parcelas > 1) {
    throw new ErroApi(
      409,
      'Para editar compra parcelada, exclua o grupo e cadastre novamente.'
    );
  }

  const d = dados({
    ...body,
    total_parcelas: 1
  });

  await relacionamentos(usuarioId, d);

  await pool.execute(
    `UPDATE lancamentos
     SET tipo = ?, descricao = ?, valor = ?, data = ?,
         categoria_id = ?, fonte_destino_id = ?
     WHERE usuario_id = ? AND id = ?`,
    [
      d.tipo,
      d.descricao,
      v.moeda(d.valor),
      d.data,
      d.categoriaId,
      d.fonteId,
      usuarioId,
      lancamentoId
    ]
  );

  return obter(usuarioId, lancamentoId);
}

async function excluir(
  usuarioId,
  lancamentoId,
  todasParcelas = false
) {
  const atual = await obter(usuarioId, lancamentoId);

  if (!atual) {
    v.naoEncontrado('Lançamento');
  }

  if (todasParcelas && atual.grupo_parcelamento) {
    const [result] = await pool.execute(
      `DELETE FROM lancamentos
       WHERE usuario_id = ?
         AND grupo_parcelamento = ?`,
      [usuarioId, atual.grupo_parcelamento]
    );

    return { excluidos: result.affectedRows };
  }

  await pool.execute(
    `DELETE FROM lancamentos
     WHERE usuario_id = ? AND id = ?`,
    [usuarioId, lancamentoId]
  );

  return { excluidos: 1 };
}

module.exports = {
  listar,
  obter,
  criar,
  editar,
  excluir
};
