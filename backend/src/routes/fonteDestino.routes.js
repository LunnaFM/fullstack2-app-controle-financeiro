const express = require('express');
const FonteDestino = require('../models/FonteDestino');
const v = require('../models/financeiroValidacoes');

const router = express.Router();

// GET /api/fontes-destinos
router.get('/', async (req, res, next) => {
  try {
    const registros = await FonteDestino.listar(req.usuarioId);

    return res.status(200).json(registros);
  } catch (error) {
    next(error);
  }
});

// POST /api/fontes-destinos
router.post('/', async (req, res, next) => {
  try {
    const registro = await FonteDestino.criar(
      req.usuarioId,
      req.body
    );

    return res.status(201).json(registro);
  } catch (error) {
    next(error);
  }
});

// PUT /api/fontes-destinos/:id
router.put('/:id', async (req, res, next) => {
  try {
    const registroId = v.id(req.params.id);

    const registro = await FonteDestino.editar(
      req.usuarioId,
      registroId,
      req.body
    );

    return res.status(200).json(registro);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/fontes-destinos/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const registroId = v.id(req.params.id);

    await FonteDestino.excluir(
      req.usuarioId,
      registroId
    );

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
