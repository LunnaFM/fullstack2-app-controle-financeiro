// Validação (no servidor) dos dados de cadastro e login.
// Se algo estiver errado, responde 400 no padrão de erro, com a mensagem de cada campo.
// Se estiver tudo certo, deixa em req.body os valores já normalizados.
const { ErroApi } = require('./erros');
const {
  cpfValido,
  emailValido,
  senhaValida,
  normalizarEmail,
  normalizarCpf,
  normalizarNome,
} = require('../models/validacoes');

const ehTextoPreenchido = (valor) => typeof valor === 'string' && valor.trim() !== '';

function validarCadastro(req, res, next) {
  const { nome, email, cpf, senha, confirmacaoSenha } = req.body ?? {};
  const campos = {};

  if (!ehTextoPreenchido(nome)) campos.nome = 'Informe o nome.';
  else if (normalizarNome(nome).length > 120) campos.nome = 'O nome deve ter no máximo 120 caracteres.';

  if (!ehTextoPreenchido(email)) campos.email = 'Informe o e-mail.';
  else if (!emailValido(email) || normalizarEmail(email).length > 160) campos.email = 'E-mail inválido.';

  if (!ehTextoPreenchido(cpf)) campos.cpf = 'Informe o CPF.';
  else if (!cpfValido(cpf)) campos.cpf = 'CPF inválido.';

  if (!ehTextoPreenchido(senha)) campos.senha = 'Informe a senha.';
  else if (!senhaValida(senha)) {
    campos.senha = 'A senha deve ter de 8 a 72 caracteres, com letras e números.';
  }

  // A confirmação é opcional para a API, mas, se vier, precisa bater com a senha.
  if (confirmacaoSenha !== undefined && confirmacaoSenha !== senha) {
    campos.confirmacaoSenha = 'A confirmação não confere com a senha.';
  }

  if (Object.keys(campos).length > 0) {
    throw new ErroApi(400, 'Dados inválidos.', campos);
  }

  req.body = {
    nome: normalizarNome(nome),
    email: normalizarEmail(email),
    cpf: normalizarCpf(cpf),
    senha,
  };
  return next();
}

function validarLogin(req, res, next) {
  const { email, senha } = req.body ?? {};
  const campos = {};

  if (!ehTextoPreenchido(email)) campos.email = 'Informe o e-mail.';
  if (typeof senha !== 'string' || senha === '') campos.senha = 'Informe a senha.';

  if (Object.keys(campos).length > 0) {
    throw new ErroApi(400, 'Dados inválidos.', campos);
  }

  req.body = { email: normalizarEmail(email), senha };
  return next();
}

module.exports = { validarCadastro, validarLogin };
