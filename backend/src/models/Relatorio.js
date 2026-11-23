// Relatórios (RF7, RF8 e RF9). Os totais são calculados no banco com GROUP BY e SUM;
// aqui só se calculam percentuais, saldos e a distribuição das parcelas nas faturas.
const pool = require('../config/database');
const { periodoAnterior } = require('./periodos');
const { montarFaturasDoCartao, paraCentavos, paraReais } = require('./faturas');

const percentual = (parte, total) => (total > 0 ? Math.round((parte / total) * 10000) / 100 : 0);

// RF7 — totais por categoria no período, com o período anterior de mesmo tamanho
async function porCategoria(usuarioId, inicio, fim) {
  const anterior = periodoAnterior(inicio, fim);

  const [linhas] = await pool.execute(
    `SELECT c.id, c.nome, c.tipo,
            SUM(CASE WHEN l.data BETWEEN ? AND ? THEN l.valor ELSE 0 END) AS atual,
            SUM(CASE WHEN l.data BETWEEN ? AND ? THEN l.valor ELSE 0 END) AS anterior
       FROM lancamentos l
       JOIN categorias  c ON c.id = l.categoria_id
      WHERE l.usuario_id = ?
        AND l.data BETWEEN ? AND ?
      GROUP BY c.id, c.nome, c.tipo`,
    [inicio, fim, anterior.inicio, anterior.fim, usuarioId, anterior.inicio, fim],
  );

  const montar = (tipo) => {
    const itens = linhas
      .filter((l) => l.tipo === tipo)
      .map((l) => ({ id: l.id, nome: l.nome, atual: paraCentavos(l.atual), anterior: paraCentavos(l.anterior) }));
    const total = itens.reduce((soma, i) => soma + i.atual, 0);
    const totalAnterior = itens.reduce((soma, i) => soma + i.anterior, 0);

    const categorias = itens
      .map((i) => ({
        id: i.id,
        nome: i.nome,
        total: paraReais(i.atual),
        percentual: percentual(i.atual, total),
        periodoAnterior: paraReais(i.anterior),
        variacao: paraReais(i.atual - i.anterior), // > 0 aumentou, < 0 reduziu
      }))
      .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome));

    return { total: paraReais(total), totalAnterior: paraReais(totalAnterior), categorias };
  };

  const saidas = montar('saida');
  const entradas = montar('entrada');

  return {
    periodo: { inicio, fim },
    periodoAnterior: anterior,
    totalSaidas: saidas.total,
    totalSaidasAnterior: saidas.totalAnterior,
    totalEntradas: entradas.total,
    totalEntradasAnterior: entradas.totalAnterior,
    categorias: saidas.categorias, // saídas por categoria (formato do enunciado)
    entradas: entradas.categorias,
  };
}

// RF8 — entradas, saídas e saldo por fonte/destino no período
async function porFonteDestino(usuarioId, inicio, fim) {
  const [linhas] = await pool.execute(
    `SELECT f.id, f.nome, f.tipo,
            COALESCE(SUM(CASE WHEN l.tipo = 'entrada' THEN l.valor END), 0) AS entradas,
            COALESCE(SUM(CASE WHEN l.tipo = 'saida'   THEN l.valor END), 0) AS saidas
       FROM fontes_destinos f
       LEFT JOIN lancamentos l
              ON l.fonte_destino_id = f.id
             AND l.data BETWEEN ? AND ?
      WHERE f.usuario_id = ?
      GROUP BY f.id, f.nome, f.tipo
      ORDER BY f.nome`,
    [inicio, fim, usuarioId],
  );

  let totalEntradas = 0;
  let totalSaidas = 0;
  const fontesDestinos = linhas.map((l) => {
    const entradas = paraCentavos(l.entradas);
    const saidas = paraCentavos(l.saidas);
    totalEntradas += entradas;
    totalSaidas += saidas;
    return {
      id: l.id,
      nome: l.nome,
      tipo: l.tipo,
      entradas: paraReais(entradas),
      saidas: paraReais(saidas),
      // O saldo só faz sentido para contas (dinheiro que fica parado nela)
      saldo: l.tipo === 'conta' ? paraReais(entradas - saidas) : null,
    };
  });

  return {
    periodo: { inicio, fim },
    totalEntradas: paraReais(totalEntradas),
    totalSaidas: paraReais(totalSaidas),
    fontesDestinos,
  };
}

// RF9 — fatura aberta + próximas faturas de cada cartão
async function faturas(usuarioId, hoje, meses) {
  const [cartoes] = await pool.execute(
    `SELECT id, nome, dia_fechamento, dia_vencimento, limite
       FROM fontes_destinos
      WHERE usuario_id = ? AND tipo = 'cartao_credito'
      ORDER BY nome`,
    [usuarioId],
  );

  const [lancamentos] = await pool.execute(
    `SELECT l.id, l.fonte_destino_id, l.descricao, l.valor, l.data,
            l.parcela_atual, l.total_parcelas, c.nome AS categoria
       FROM lancamentos l
       JOIN categorias  c ON c.id = l.categoria_id
       JOIN fontes_destinos f ON f.id = l.fonte_destino_id
      WHERE l.usuario_id = ? AND l.tipo = 'saida' AND f.tipo = 'cartao_credito'
      ORDER BY l.data, l.id`,
    [usuarioId],
  );

  return {
    hoje,
    cartoes: cartoes.map((cartao) =>
      montarFaturasDoCartao(
        cartao,
        lancamentos.filter((l) => l.fonte_destino_id === cartao.id),
        hoje,
        meses,
      )),
  };
}

module.exports = { porCategoria, porFonteDestino, faturas };
