function formatarCompetencia(ano, mes) {
  const mesFormatado = String(mes).padStart(2, '0');
  return `${ano}-${mesFormatado}`;
}

function dataValida(data) {
  const partes = String(data || '').slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!partes) return null;

  const ano = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  const dataUtc = new Date(Date.UTC(ano, mes - 1, dia));

  if (
    dataUtc.getUTCFullYear() !== ano ||
    dataUtc.getUTCMonth() !== mes - 1 ||
    dataUtc.getUTCDate() !== dia
  ) {
    return null;
  }

  return { ano, mes, dia };
}

export function competenciaDaFatura(dataLancamento, diaFechamento, diaVencimento) {
  const data = dataValida(dataLancamento);
  const fechamento = Number(diaFechamento);
  const vencimento = Number(diaVencimento);

  if (
    !data ||
    !Number.isInteger(fechamento) ||
    fechamento < 1 ||
    fechamento > 31 ||
    !Number.isInteger(vencimento) ||
    vencimento < 1 ||
    vencimento > 31
  ) {
    return null;
  }

  const mesesAteFechamento = data.dia >= fechamento ? 1 : 0;
  const mesesAteVencimento = vencimento <= fechamento ? 1 : 0;
  const indiceMes =
    data.ano * 12 +
    data.mes -
    1 +
    mesesAteFechamento +
    mesesAteVencimento;
  const anoFatura = Math.floor(indiceMes / 12);
  const mesFatura = (indiceMes % 12) + 1;

  return formatarCompetencia(anoFatura, mesFatura);
}

export function proximasCompetencias(dataAtual, quantidade = 3) {
  const data = dataValida(dataAtual);

  if (!data || !Number.isInteger(quantidade) || quantidade < 0) {
    throw new RangeError('Data ou quantidade de competências inválida.');
  }

  return Array.from({ length: quantidade }, (_, index) => {
    const indiceMes = data.ano * 12 + data.mes - 1 + index + 1;
    const ano = Math.floor(indiceMes / 12);
    const mes = (indiceMes % 12) + 1;
    const chave = formatarCompetencia(ano, mes);
    const competencia = new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    });

    return {
      chave,
      mes: index === 0 ? 'Próximo mês' : `Mês +${index + 1}`,
      competencia,
    };
  });
}

export function valorEmCentavos(valor) {
  const partes = String(valor ?? '').match(/^(\d+)(?:\.(\d{1,2}))?$/);

  if (!partes) {
    throw new RangeError('Valor monetário inválido.');
  }

  return Number(partes[1]) * 100 + Number((partes[2] || '').padEnd(2, '0'));
}
