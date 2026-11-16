const express = require('express');
const Categoria = require('../models/Categoria');
const v = require('../models/financeiroValidacoes');

const router = express.Router();

// GET /api/categorias
// Lista todas as categorias do usuário autenticado.
router.get('/', async (req, res, next) => {
  try {
    const categorias = await Categoria.listar(req.usuarioId);

    return res.status(200).json(categorias);
  } catch (error) {
    next(error);
  }
});

// POST /api/categorias
// Cadastra uma nova categoria.
router.post('/', async (req, res, next) => {
  try {
    const categoria = await Categoria.criar(
      req.usuarioId,
      req.body
    );

    return res.status(201).json(categoria);
  } catch (error) {
    next(error);
  }
});

// PUT /api/categorias/:id
// Atualiza uma categoria existente.
router.put('/:id', async (req, res, next) => {
  try {
    const categoriaId = v.id(req.params.id);

    const categoria = await Categoria.editar(
      req.usuarioId,
      categoriaId,
      req.body
    );

    return res.status(200).json(categoria);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/categorias/:id
// Exclui uma categoria sem lançamentos vinculados.
router.delete('/:id', async (req, res, next) => {
  try {
    const categoriaId = v.id(req.params.id);

    await Categoria.excluir(req.usuarioId, categoriaId);

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
