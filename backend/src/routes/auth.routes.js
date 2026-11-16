// Rotas de autenticação: /api/auth/...
// Os controladores ficam no próprio arquivo de rotas.
const express = require('express');
const bcrypt = require('bcrypt');

const Usuario = require('../models/Usuario');
const { ErroApi } = require('../middlewares/erros');
const { validarCadastro } = require('../middlewares/validarAuth');

const router = express.Router();

const CUSTO_BCRYPT = 10; // rodadas de salt do bcrypt

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

module.exports = router;
