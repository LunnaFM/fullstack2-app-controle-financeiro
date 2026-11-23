const { test } = require('node:test');
const assert = require('node:assert/strict');

const { calcularFatura, montarFaturasDoCartao } = require('../src/models/faturas');
const { periodoAnterior, mesDe } = require('../src/models/periodos');

const nubank = { diaFechamento: 3, diaVencimento: 10 };
const visa = { diaFechamento: 25, diaVencimento: 5 };

test('regra de fechamento: exemplos da tabela do enunciado', () => {
  assert.deepEqual(calcularFatura('2026-11-02', nubank), {
    referencia: '2026-11', fechamento: '2026-11-03', vencimento: '2026-11-10',
  });
  // compra NO DIA do fechamento vai para a fatura seguinte
  assert.deepEqual(calcularFatura('2026-11-03', nubank), {
    referencia: '2026-12', fechamento: '2026-12-03', vencimento: '2026-12-10',
  });
  assert.deepEqual(calcularFatura('2026-12-28', visa), {
    referencia: '2027-02', fechamento: '2027-01-25', vencimento: '2027-02-05',
  });
  // parcela 3/3 de compra de 20/12: gravada com data 20/02 (compra + 2 meses)
  assert.deepEqual(calcularFatura('2027-02-20', visa), {
    referencia: '2027-03', fechamento: '2027-02-25', vencimento: '2027-03-05',
  });
});

test('fechamento no dia 31 é ajustado para o fim de fevereiro', () => {
  const cartao = { diaFechamento: 31, diaVencimento: 10 };
  assert.equal(calcularFatura('2027-02-10', cartao).fechamento, '2027-02-28');
});

test('período anterior: mês completo compara com o mês anterior', () => {
  assert.deepEqual(periodoAnterior('2026-10-01', '2026-10-31'), { inicio: '2026-09-01', fim: '2026-09-30' });
  assert.deepEqual(periodoAnterior('2026-03-01', '2026-03-31'), { inicio: '2026-02-01', fim: '2026-02-28' });
  assert.deepEqual(periodoAnterior('2026-09-01', '2026-11-30'), { inicio: '2026-06-01', fim: '2026-08-31' });
});

test('período anterior: intervalo qualquer usa a mesma quantidade de dias', () => {
  assert.deepEqual(periodoAnterior('2026-11-10', '2026-11-19'), { inicio: '2026-10-31', fim: '2026-11-09' });
});

test('mesDe devolve o primeiro e o último dia do mês', () => {
  assert.deepEqual(mesDe('2026-02-15'), { inicio: '2026-02-01', fim: '2026-02-28' });
});

test('faturas do cartão: parcelas nas faturas certas e limite comprometido', () => {
  const cartao = { id: 1, nome: 'Nubank', dia_fechamento: 3, dia_vencimento: 10, limite: '3000.00' };
  const lancamentos = [
    // R$ 250 em 3x comprado no dia do fechamento (03/11)
    { id: 1, descricao: 'Fone', valor: '83.34', data: '2026-11-03', parcela_atual: 1, total_parcelas: 3, categoria: 'Lazer' },
    { id: 2, descricao: 'Fone', valor: '83.33', data: '2026-12-03', parcela_atual: 2, total_parcelas: 3, categoria: 'Lazer' },
    { id: 3, descricao: 'Fone', valor: '83.33', data: '2027-01-03', parcela_atual: 3, total_parcelas: 3, categoria: 'Lazer' },
    // compra antiga, fatura já vencida: não compromete o limite
    { id: 4, descricao: 'Mercado', valor: '100.00', data: '2026-10-01', parcela_atual: 1, total_parcelas: 1, categoria: 'Alimentação' },
  ];

  const r = montarFaturasDoCartao(cartao, lancamentos, '2026-11-22', 3);

  assert.deepEqual(r.faturas.map((f) => [f.referencia, f.situacao, f.total]), [
    ['2026-12', 'aberta', 83.34],
    ['2027-01', 'futura', 83.33],
    ['2027-02', 'futura', 83.33],
    ['2027-03', 'futura', 0],
  ]);
  assert.equal(r.faturas[0].lancamentos[0].parcela, '1/3');
  assert.equal(r.limiteUtilizado, 250);
  assert.equal(r.limiteDisponivel, 2750);
});
