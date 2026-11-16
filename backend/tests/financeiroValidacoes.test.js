const test = require('node:test');
const assert = require('node:assert/strict');

const v = require('../src/models/financeiroValidacoes');

test('R$ 100 em 3 parcelas soma centavos exatos', () => {
  const total = v.centavos('100.00');

  const base = Math.floor(total / 3);
  const resto = total % 3;

  const parcelas = [
    base + resto,
    base,
    base
  ];

  assert.deepEqual(
    parcelas.map(v.moeda),
    ['33.34', '33.33', '33.33']
  );

  assert.equal(
    parcelas.reduce((soma, valor) => soma + valor, 0),
    total
  );
});

test('R$ 250 em 7 parcelas soma exatamente', () => {
  const total = v.centavos('250.00');

  const base = Math.floor(total / 7);
  const resto = total % 7;

  assert.equal(base * 7 + resto, total);
});

test('datas inválidas são rejeitadas', () => {
  assert.throws(() => {
    v.data('2026-02-30');
  });
});

test('adicionar meses ajusta último dia', () => {
  assert.equal(
    v.adicionarMeses('2026-01-31', 1),
    '2026-02-28'
  );
});

test('rejeita valor com mais de duas casas', () => {
  assert.throws(() => {
    v.centavos('1.999');
  });
});

test('rejeita identificador inválido', () => {
  assert.throws(() => {
    v.id('1 OR 1=1');
  });
});
