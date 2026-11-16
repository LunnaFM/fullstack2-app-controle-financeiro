// Tratamento de erros centralizado.
// Toda resposta de erro da API segue o mesmo formato:
//   { "erro": "mensagem geral", "campos": { "campo": "mensagem do campo" } }
// ("campos" só aparece quando o erro é de um campo específico.)

// Erro "esperado", com status HTTP definido. As rotas podem fazer:
//   throw new ErroApi(404, 'Lançamento não encontrado.');
//   throw new ErroApi(400, 'Dados inválidos.', { valor: 'O valor deve ser maior que zero.' });
class ErroApi extends Error {
  constructor(status, mensagem, campos) {
    super(mensagem);
    this.name = 'ErroApi';
    this.status = status;
    this.campos = campos;
  }
}

function corpoDeErro(mensagem, campos) {
  return campos ? { erro: mensagem, campos } : { erro: mensagem };
}

// Rota inexistente (registrado depois de todas as rotas)
function rotaNaoEncontrada(req, res) {
  res.status(404).json(corpoDeErro('Rota não encontrada.'));
}

// Middleware de erro: tem 4 parâmetros e é registrado por último.
// No Express 5, erros lançados em rotas async chegam aqui automaticamente.
// eslint-disable-next-line no-unused-vars
function tratarErros(erro, req, res, next) {
  if (erro instanceof ErroApi) {
    return res.status(erro.status).json(corpoDeErro(erro.message, erro.campos));
  }

  // JSON malformado no corpo da requisição (lançado pelo express.json())
  if (erro.type === 'entity.parse.failed') {
    return res.status(400).json(corpoDeErro('O corpo da requisição não é um JSON válido.'));
  }

  // O detalhe fica só no console do servidor; o cliente recebe uma mensagem genérica.
  console.error(erro);
  return res.status(500).json(corpoDeErro('Erro interno do servidor.'));
}

module.exports = { ErroApi, rotaNaoEncontrada, tratarErros };
