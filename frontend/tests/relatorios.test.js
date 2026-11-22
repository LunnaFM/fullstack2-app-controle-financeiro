import assert from 'node:assert/strict';
import test from 'node:test';
import {
  filtrarLancamentosPorPeriodo,
  serializarCsv,
} from '../src/services/relatorios.js';

const lancamentos = [
  { data: '2026-08-31', descricao: 'Agosto' },
  { data: '2026-09-01', descricao: 'Setembro' },
  { data: '2026-11-22', descricao: 'Hoje' },
  { data: '2026-11-23', descricao: 'Futuro' },
];

test('período mensal inclui o mês atual até hoje', () => {
  assert.deepEqual(
    filtrarLancamentosPorPeriodo(lancamentos, 'mes-atual', '2026-11-22').map(
      (item) => item.descricao
    ),
    ['Hoje']
  );
});

test('últimos três meses incluem o mês atual e dois anteriores', () => {
  assert.deepEqual(
    filtrarLancamentosPorPeriodo(
      lancamentos,
      'ultimos-3-meses',
      '2026-11-22'
    ).map((item) => item.descricao),
    ['Setembro', 'Hoje']
  );
});

test('período anual avança corretamente na virada do ano', () => {
  const itens = [
    { data: '2025-12-31' },
    { data: '2026-01-01' },
    { data: '2026-01-02' },
  ];

  assert.deepEqual(
    filtrarLancamentosPorPeriodo(itens, 'ano-atual', '2026-01-02'),
    itens.slice(1)
  );
});

test('CSV escapa separadores, aspas e conteúdo que poderia ser fórmula', () => {
  assert.equal(
    serializarCsv([['Descrição', 'Nome'], ['"mercado"; compra', '=1+1']]),
    '\uFEFF"Descrição";"Nome"\r\n"""mercado""; compra";"\u0027=1+1"'
  );
});

test('período inválido é rejeitado', () => {
  assert.throws(
    () => filtrarLancamentosPorPeriodo(lancamentos, 'invalido', '2026-11-22'),
    RangeError
  );
});
