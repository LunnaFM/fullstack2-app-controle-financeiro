function analisarData(data) {
  const partes = String(data ?? '').slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
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

function formatarDataISO(ano, mes, dia = 1) {
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

export function filtrarLancamentosPorPeriodo(lancamentos, periodo, hoje) {
  if (!Array.isArray(lancamentos)) {
    throw new TypeError('A lista de lançamentos precisa ser um array.');
  }
  if (periodo === 'todos') return lancamentos;

  const dataAtual = analisarData(hoje);
  if (!dataAtual) {
    throw new RangeError('Data de referência inválida.');
  }

  let inicio;
  if (periodo === 'mes-atual') {
    inicio = formatarDataISO(dataAtual.ano, dataAtual.mes);
  } else if (periodo === 'ultimos-3-meses') {
    const indiceMes = dataAtual.ano * 12 + dataAtual.mes - 1 - 2;
    const ano = Math.floor(indiceMes / 12);
    const mes = (indiceMes % 12) + 1;
    inicio = formatarDataISO(ano, mes);
  } else if (periodo === 'ano-atual') {
    inicio = formatarDataISO(dataAtual.ano, 1);
  } else {
    throw new RangeError('Período de relatório inválido.');
  }

  const fim = formatarDataISO(dataAtual.ano, dataAtual.mes, dataAtual.dia);
  return lancamentos.filter((lancamento) => {
    const dataLancamento = analisarData(lancamento.data);
    if (!dataLancamento) return false;

    const dataISO = formatarDataISO(
      dataLancamento.ano,
      dataLancamento.mes,
      dataLancamento.dia
    );
    return dataISO >= inicio && dataISO <= fim;
  });
}

export function serializarCsv(linhas) {
  const escaparCampo = (valor) => {
    const texto = String(valor ?? '');
    const seguro = /^[\t\r\n ]*[=+\-@]/.test(texto) ? `'${texto}` : texto;
    return `"${seguro.replace(/"/g, '""')}"`;
  };

  return `\uFEFF${linhas
    .map((linha) => linha.map(escaparCampo).join(';'))
    .join('\r\n')}`;
}
