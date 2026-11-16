const { ErroApi } = require('../middlewares/erros');

function falha(campo, mensagem) {
  throw new ErroApi(400, 'Dados inválidos.', {
    [campo]: mensagem
  });
}

function id(valor, campo = 'id') {
  const n = Number(valor);

  if (!Number.isSafeInteger(n) || n < 1) {
    falha(campo, 'Informe um identificador válido.');
  }

  return n;
}

function texto(valor, campo, max = 120) {
  if (
    typeof valor !== 'string' ||
    !valor.trim() ||
    valor.trim().length > max
  ) {
    falha(campo, `Informe um texto de até ${max} caracteres.`);
  }

  return valor.trim();
}

function escolha(valor, campo, opcoes) {
  if (!opcoes.includes(valor)) {
    falha(campo, `Use: ${opcoes.join(', ')}.`);
  }

  return valor;
}

function inteiro(valor, campo, min, max) {
  const n = Number(valor);

  if (!Number.isInteger(n) || n < min || n > max) {
    falha(campo, `Informe um inteiro entre ${min} e ${max}.`);
  }

  return n;
}

function centavos(valor, campo = 'valor', zero = false) {
  const s = typeof valor === 'number'
    ? String(valor)
    : valor;

  if (
    typeof s !== 'string' ||
    !/^\d{1,10}(?:\.\d{1,2})?$/.test(s)
  ) {
    falha(
      campo,
      'Informe um valor monetário positivo com até duas casas decimais (ponto decimal).'
    );
  }

  const [reais, cents = ''] = s.split('.');

  const n =
    Number(reais) * 100 +
    Number(cents.padEnd(2, '0'));

  if (
    !Number.isSafeInteger(n) ||
    n > 999999999999 ||
    (!zero && n === 0)
  ) {
    falha(campo, 'Valor fora do intervalo permitido.');
  }

  return n;
}

function moeda(n) {
  return `${Math.floor(n / 100)}.${String(n % 100).padStart(2, '0')}`;
}

function data(valor, campo = 'data') {
  if (
    typeof valor !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(valor)
  ) {
    falha(campo, 'Use YYYY-MM-DD.');
  }

  const [ano, mes, dia] = valor.split('-').map(Number);

  const d = new Date(Date.UTC(ano, mes - 1, dia));

  if (
    d.getUTCFullYear() !== ano ||
    d.getUTCMonth() !== mes - 1 ||
    d.getUTCDate() !== dia
  ) {
    falha(campo, 'Data inexistente.');
  }

  return valor;
}

function adicionarMeses(valor, n) {
  const [ano, mes, dia] = valor.split('-').map(Number);

  const primeiro = new Date(
    Date.UTC(ano, mes - 1 + n, 1)
  );

  const ultimo = new Date(
    Date.UTC(
      primeiro.getUTCFullYear(),
      primeiro.getUTCMonth() + 1,
      0
    )
  ).getUTCDate();

  return `${primeiro.getUTCFullYear()}-${String(
    primeiro.getUTCMonth() + 1
  ).padStart(2, '0')}-${String(
    Math.min(dia, ultimo)
  ).padStart(2, '0')}`;
}

function erroBanco(erro, campo = 'nome') {
  if (erro.code === 'ER_DUP_ENTRY') {
    throw new ErroApi(409, 'Registro duplicado.', {
      [campo]: 'Já existe um registro com esses dados.'
    });
  }

  throw erro;
}

function naoEncontrado(nome) {
  throw new ErroApi(404, `${nome} não encontrado(a).`);
}

module.exports = {
  falha,
  id,
  texto,
  escolha,
  inteiro,
  centavos,
  moeda,
  data,
  adicionarMeses,
  erroBanco,
  naoEncontrado
};
