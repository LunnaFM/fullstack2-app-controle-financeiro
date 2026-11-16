
const express = require('express');
const Lancamento = require('../models/Lancamento');
const v = require('../models/financeiroValidacoes');

const router = express.Router();

// GET /api/lancamentos
// Lista lançamentos com filtros, paginação e totais.
router.get('/', async (req, res, next) => {
  try {
    const resultado = await Lancamento.listar(
      req.usuarioId,
      req.query
    );

    return res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
});

// GET /api/lancamentos/:id
// Busca um lançamento específico.
router.get('/:id', async (req, res, next) => {
  try {
    const lancamentoId = v.id(req.params.id);

    const lancamento = await Lancamento.obter(
      req.usuarioId,
      lancamentoId
    );

    if (!lancamento) {
      return res.status(404).json({
        erro: 'Lançamento não encontrado.'
      });
    }

    return res.status(200).json(lancamento);
  } catch (error) {
    next(error);
  }
});

// POST /api/lancamentos
// Cadastra um lançamento simples ou parcelado.
router.post('/', async (req, res, next) => {
  try {
    const resultado = await Lancamento.criar(
      req.usuarioId,
      req.body
    );

    return res.status(201).json(resultado);
  } catch (error) {
    next(error);
  }
});

// PUT /api/lancamentos/:id
// Edita um lançamento simples.
router.put('/:id', async (req, res, next) => {
  try {
    const lancamentoId = v.id(req.params.id);

    const resultado = await Lancamento.editar(
      req.usuarioId,
      lancamentoId,
      req.body
    );

    return res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/lancamentos/:id
// Exclui uma parcela ou o grupo inteiro.
router.delete('/:id', async (req, res, next) => {
  try {
    const lancamentoId = v.id(req.params.id);

    const todasParcelas =
      req.query.todasParcelas === 'true';

    const resultado = await Lancamento.excluir(
      req.usuarioId,
      lancamentoId,
      todasParcelas
    );

    return res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
