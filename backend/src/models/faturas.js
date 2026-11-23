// Regras de fatura de cartão de crédito (funções puras, sem banco).
//
// Regra de fechamento (enunciado, RF9):
// - compra ANTES do dia de fechamento → fatura que fecha no mesmo mês;
// - compra NO DIA do fechamento ou depois → fatura do mês seguinte;
// - vencimento > fechamento → vence no mesmo mês do fechamento; senão, no mês seguinte;
// - dia inexistente (ex.: 31 em fevereiro) → último dia do mês.
//
// Cada parcela é gravada com a data da compra + (k - 1) meses (ver Lancamento.criar),
// então basta aplicar a regra à data de cada parcela.
const { ultimoDiaDoMes, iso } = require('./periodos');

function dataSegura(ano, mes, dia) { // aceita mes > 11 e ajusta dia 31 em meses curtos
  const a = ano + Math.floor(mes / 12);
  const m = ((mes % 12) + 12) % 12;
  return new Date(Date.UTC(a, m, Math.min(dia, ultimoDiaDoMes(a, m))));
}

// Implementação de referência do enunciado.
// mesesDepois: 0 = fatura em que a data cai; 1 = a seguinte; ...
function calcularFatura(data, cartao, mesesDepois = 0) {
  const [ano, mes, dia] = data.split('-').map(Number);
  const m = mes - 1;
  const fechamentoDoMes = Math.min(cartao.diaFechamento, ultimoDiaDoMes(ano, m));

  const mesFechamento = (dia < fechamentoDoMes ? m : m + 1) + mesesDepois;
  const fechamento = dataSegura(ano, mesFechamento, cartao.diaFechamento);

  const mesVencimento =
    cartao.diaVencimento > cartao.diaFechamento ? mesFechamento : mesFechamento + 1;
  const vencimento = dataSegura(ano, mesVencimento, cartao.diaVencimento);

  return {
    referencia: iso(vencimento).slice(0, 7), // mês do vencimento, ex.: '2026-12'
    fechamento: iso(fechamento),
    vencimento: iso(vencimento),
  };
}

const paraCentavos = (valor) => Math.round(Number(valor) * 100);
const paraReais = (centavos) => centavos / 100;

// Monta, para UM cartão, a fatura aberta + as próximas "meses" faturas.
// lancamentos: [{ id, descricao, valor, data, parcela_atual, total_parcelas, categoria }]
function montarFaturasDoCartao(cartao, lancamentos, hoje, meses = 3) {
  const regra = { diaFechamento: cartao.dia_fechamento, diaVencimento: cartao.dia_vencimento };

  // A fatura aberta é a que ainda vai fechar: a mesma em que uma compra feita hoje cairia.
  const faturas = [];
  for (let n = 0; n <= meses; n++) {
    const datas = calcularFatura(hoje, regra, n);
    faturas.push({
      ...datas,
      situacao: n === 0 ? 'aberta' : 'futura',
      totalCentavos: 0,
      lancamentos: [],
    });
  }
  const porReferencia = new Map(faturas.map((f) => [f.referencia, f]));

  let utilizadoCentavos = 0;
  for (const l of lancamentos) {
    const fatura = calcularFatura(l.data, regra);
    const centavos = paraCentavos(l.valor);

    // Limite comprometido: tudo o que ainda não venceu
    if (fatura.vencimento >= hoje) utilizadoCentavos += centavos;

    const destino = porReferencia.get(fatura.referencia);
    if (destino) {
      destino.totalCentavos += centavos;
      destino.lancamentos.push({
        id: l.id,
        descricao: l.descricao,
        categoria: l.categoria,
        data: l.data,
        parcela: `${l.parcela_atual}/${l.total_parcelas}`,
        valor: paraReais(centavos),
      });
    }
  }

  const limiteCentavos = paraCentavos(cartao.limite);
  return {
    id: cartao.id,
    nome: cartao.nome,
    diaFechamento: cartao.dia_fechamento,
    diaVencimento: cartao.dia_vencimento,
    limite: paraReais(limiteCentavos),
    limiteUtilizado: paraReais(utilizadoCentavos),
    limiteDisponivel: paraReais(limiteCentavos - utilizadoCentavos),
    faturas: faturas.map(({ totalCentavos, ...f }) => ({ ...f, total: paraReais(totalCentavos) })),
  };
}

module.exports = { calcularFatura, montarFaturasDoCartao, paraCentavos, paraReais };
