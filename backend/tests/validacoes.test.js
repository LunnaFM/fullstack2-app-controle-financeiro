// Testes das funções de validação (node:test, nativo do Node — sem biblioteca extra).
// Executar com: npm test
const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  cpfValido,
  emailValido,
  senhaValida,
  normalizarEmail,
  normalizarCpf,
} = require('../src/models/validacoes');

test('cpfValido aceita CPF válido com e sem pontuação', () => {
  assert.equal(cpfValido('529.982.247-25'), true);
  assert.equal(cpfValido('52998224725'), true);
  assert.equal(cpfValido('111.444.777-35'), true);
});

test('cpfValido rejeita dígito verificador errado, tamanho errado e dígitos repetidos', () => {
  assert.equal(cpfValido('529.982.247-24'), false);
  assert.equal(cpfValido('5299822472'), false);
  assert.equal(cpfValido('111.111.111-11'), false);
  assert.equal(cpfValido(''), false);
  assert.equal(cpfValido(undefined), false);
});

test('emailValido', () => {
  assert.equal(emailValido('ana@email.com'), true);
  assert.equal(emailValido('  Ana@Email.com '), true);
  assert.equal(emailValido('ana@email'), false);
  assert.equal(emailValido('ana email@x.com'), false);
  assert.equal(emailValido(123), false);
});

test('senhaValida exige 8+ caracteres com letras e números', () => {
  assert.equal(senhaValida('abc12345'), true);
  assert.equal(senhaValida('abcdefgh'), false);
  assert.equal(senhaValida('12345678'), false);
  assert.equal(senhaValida('abc123'), false);
  assert.equal(senhaValida(12345678), false);
});

test('normalização de e-mail e CPF', () => {
  assert.equal(normalizarEmail('  Ana@Email.COM '), 'ana@email.com');
  assert.equal(normalizarCpf('529.982.247-25'), '52998224725');
});
