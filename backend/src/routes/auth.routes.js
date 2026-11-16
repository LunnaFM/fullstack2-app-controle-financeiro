// Rotas de autenticação: /api/auth/...
// Os controladores ficam no próprio arquivo de rotas.
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const { jwt: configJwt } = require('../config/ambiente');
const Usuario = require('../models/Usuario');
const { ErroApi } = require('../middlewares/erros');
const { validarCadastro, validarLogin } = require('../middlewares/validarAuth');
const limitarLogin = require('../middlewares/limitarLogin');

const router = express.Router();

const CUSTO_BCRYPT = 10; // rodadas de salt do bcrypt

// Hash "falso", usado quando o e-mail não existe: assim o login leva o mesmo tempo
// com ou sem usuário, e o tempo de resposta não revela quais e-mails estão cadastrados.
const HASH_FALSO = bcrypt.hashSync('usuario-inexistente', CUSTO_BCRYPT);

// POST /api/auth/cadastro (pública)
router.post('/cadastro', validarCadastro, async (req, res) => {
  const { nome, email, cpf, senha } = req.body; // já validados e normalizados

  const senhaHash = await bcrypt.hash(senha, CUSTO_BCRYPT);

  try {
    const usuario = await Usuario.cadastrar({ nome, email, cpf, senhaHash });
    return res.status(201).json(usuario);
  } catch (erro) {
    // A garantia de unicidade vem do banco: o MySQL recusa o INSERT
    // e a mensagem traz o nome da restrição violada.
    if (erro.code === 'ER_DUP_ENTRY') {
      const campo = erro.sqlMessage.includes('uq_usuarios_cpf') ? 'cpf' : 'email';
      throw new ErroApi(409, 'Usuário já cadastrado.', {
        [campo]: `Já existe um usuário com este ${campo === 'cpf' ? 'CPF' : 'e-mail'}.`,
      });
    }
    throw erro; // demais erros: middleware de erros (500)
  }
});

// POST /api/auth/login (pública, com rate limiting)
router.post('/login', limitarLogin, validarLogin, async (req, res) => {
  const { email, senha } = req.body;

  // Busca SÓ pelo e-mail; a senha é comparada no Node, com o bcrypt.
  const usuario = await Usuario.buscarParaLogin(email);
  const senhaConfere = await bcrypt.compare(senha, usuario?.senha_hash ?? HASH_FALSO);

  if (!usuario || !senhaConfere) {
    // Mensagem genérica: não revela se o e-mail existe.
    throw new ErroApi(401, 'E-mail ou senha inválidos.');
  }

  // "sub" (subject) é o campo padrão do JWT para identificar o dono do token.
  const token = jwt.sign({ nome: usuario.nome }, configJwt.segredo, {
    subject: String(usuario.id),
    expiresIn: configJwt.expiraEm,
  });

  return res.json({
    token,
    usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email },
  });
});

module.exports = router;
