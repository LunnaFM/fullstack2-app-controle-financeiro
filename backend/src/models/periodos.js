// Funções puras de datas usadas pelos relatórios e pela listagem.
// Todas trabalham com texto no formato AAAA-MM-DD e em UTC, para não sofrer com fuso horário.

const iso = (d) => d.toISOString().slice(0, 10);

function paraData(texto) {
  const [ano, mes, dia] = texto.split('-').map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia));
}

function ultimoDiaDoMes(ano, mes) { // mes: 0 a 11
  return new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
}

// Data de hoje no fuso do servidor, como AAAA-MM-DD
function hojeISO(agora = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${agora.getFullYear()}-${p(agora.getMonth() + 1)}-${p(agora.getDate())}`;
}

// Primeiro e último dia do mês da data informada
function mesDe(dataISO) {
  const d = paraData(dataISO);
  const ano = d.getUTCFullYear();
  const mes = d.getUTCMonth();
  return {
    inicio: iso(new Date(Date.UTC(ano, mes, 1))),
    fim: iso(new Date(Date.UTC(ano, mes, ultimoDiaDoMes(ano, mes)))),
  };
}

function ehMesCompleto(inicio, fim) {
  const a = paraData(inicio);
  const b = paraData(fim);
  return a.getUTCDate() === 1 && b.getUTCDate() === ultimoDiaDoMes(b.getUTCFullYear(), b.getUTCMonth());
}

// Período anterior "de mesmo tamanho":
// - se o período é formado por meses completos (ex.: outubro), compara com os meses
//   imediatamente anteriores (setembro), mesmo que tenham quantidade de dias diferente;
// - senão, usa a mesma quantidade de dias, terminando na véspera do início.
function periodoAnterior(inicio, fim) {
  const a = paraData(inicio);
  const b = paraData(fim);

  if (ehMesCompleto(inicio, fim)) {
    const meses =
      (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth()) + 1;
    const inicioAnterior = new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth() - meses, 1));
    const fimAnterior = new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), 0));
    return { inicio: iso(inicioAnterior), fim: iso(fimAnterior) };
  }

  const dias = Math.round((b - a) / 86400000) + 1;
  const fimAnterior = new Date(a.getTime() - 86400000);
  const inicioAnterior = new Date(fimAnterior.getTime() - (dias - 1) * 86400000);
  return { inicio: iso(inicioAnterior), fim: iso(fimAnterior) };
}

module.exports = { hojeISO, mesDe, periodoAnterior, ultimoDiaDoMes, paraData, iso };
