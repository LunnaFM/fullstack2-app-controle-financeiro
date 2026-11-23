// Formatação de valores e datas para exibição (padrão brasileiro).

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatarMoeda(valor) {
  return moeda.format(Number(valor || 0));
}

// 'AAAA-MM-DD' → 'DD/MM/AAAA' (sem usar Date, para não sofrer com fuso horário)
export function formatarData(data) {
  if (!data) return '—';
  const [ano, mes, dia] = String(data).slice(0, 10).split('-');
  return dia ? `${dia}/${mes}/${ano}` : String(data);
}

// '2026-12' → 'dezembro de 2026'
export function formatarReferencia(referencia) {
  const [ano, mes] = referencia.split('-').map(Number);
  return new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

// Máscara de CPF enquanto o usuário digita: 52998224725 → 529.982.247-25
export function mascararCpf(texto) {
  const d = String(texto).replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

const doisDigitos = (n) => String(n).padStart(2, '0');

export function hojeISO(agora = new Date()) {
  return `${agora.getFullYear()}-${doisDigitos(agora.getMonth() + 1)}-${doisDigitos(agora.getDate())}`;
}

// Primeiro e último dia de um mês. deslocamento: 0 = mês atual, -1 = anterior...
export function periodoDoMes(deslocamento = 0, agora = new Date()) {
  const inicio = new Date(agora.getFullYear(), agora.getMonth() + deslocamento, 1);
  const fim = new Date(agora.getFullYear(), agora.getMonth() + deslocamento + 1, 0);
  return { inicio: hojeISO(inicio), fim: hojeISO(fim) };
}

// Últimos N meses completos, terminando no mês atual
export function periodoUltimosMeses(meses, agora = new Date()) {
  return { inicio: periodoDoMes(-(meses - 1), agora).inicio, fim: periodoDoMes(0, agora).fim };
}
