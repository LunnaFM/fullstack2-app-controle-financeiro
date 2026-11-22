import assert from 'node:assert/strict';
import test from 'node:test';
import {
  competenciaDaFatura,
  proximasCompetencias,
  valorEmCentavos,
} from '../src/services/faturas.js';

test('compra antes do fechamento fica na fatura do ciclo atual', () => {
  assert.equal(competenciaDaFatura('2026-11-02', 3, 10), '2026-11');
});

test('compra no dia do fechamento vai para a próxima fatura', () => {
  assert.equal(competenciaDaFatura('2026-11-03', 3, 10), '2026-12');
});

test('vencimento antes do fechamento cai no mês seguinte ao ciclo', () => {
  assert.equal(competenciaDaFatura('2026-10-24', 25, 5), '2026-11');
  assert.equal(competenciaDaFatura('2026-10-25', 25, 5), '2026-12');
});

test('competências seguintes avançam o ano corretamente', () => {
  assert.deepEqual(
    proximasCompetencias('2026-11-22', 3).map((item) => item.chave),
    ['2026-12', '2027-01', '2027-02']
  );
});

test('valores de fatura são somados em centavos', () => {
  const parcelas = ['33.34', '33.33', '33.33'];
  assert.equal(parcelas.reduce((total, valor) => total + valorEmCentavos(valor), 0), 10000);
});
