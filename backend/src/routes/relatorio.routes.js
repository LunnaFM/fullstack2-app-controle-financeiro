// Rotas de relatórios: /api/relatorios/... (protegidas pelo middleware autenticar)
const express = require('express');
const Relatorio = require('../models/Relatorio');
const v = require('../models/financeiroValidacoes');
const { hojeISO, mesDe } = require('../models/periodos');

const router = express.Router();

// Lê ?inicio=&fim= (AAAA-MM-DD). Sem período informado, usa o mês corrente.
function lerPeriodo(query) {
  const padrao = mesDe(hojeISO());
  const inicio = query.inicio ? v.data(query.inicio, 'inicio') : padrao.inicio;
  const fim = query.fim ? v.data(query.fim, 'fim') : padrao.fim;

  if (inicio > fim) {
    v.falha('fim', 'A data final deve ser igual ou posterior à inicial.');
  }
  return { inicio, fim };
}

// GET /api/relatorios/categorias?inicio=&fim=  (RF7)
router.get('/categorias', async (req, res) => {
  const { inicio, fim } = lerPeriodo(req.query);
  res.json(await Relatorio.porCategoria(req.usuarioId, inicio, fim));
});

// GET /api/relatorios/fontes-destinos?inicio=&fim=  (RF8)
router.get('/fontes-destinos', async (req, res) => {
  const { inicio, fim } = lerPeriodo(req.query);
  res.json(await Relatorio.porFonteDestino(req.usuarioId, inicio, fim));
});

// GET /api/relatorios/faturas?meses=3  (RF9: fatura aberta + próximas N faturas)
router.get('/faturas', async (req, res) => {
  const meses = v.inteiro(req.query.meses ?? 3, 'meses', 1, 12);
  res.json(await Relatorio.faturas(req.usuarioId, hojeISO(), meses));
});

module.exports = router;
