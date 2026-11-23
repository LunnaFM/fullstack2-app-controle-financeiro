import assert from 'node:assert/strict';
import test from 'node:test';
import { serializarCsv } from '../src/services/relatorios.js';

test('CSV escapa separadores, aspas e conteúdo que poderia ser fórmula', () => {
  assert.equal(
    serializarCsv([['Descrição', 'Nome'], ['"mercado"; compra', '=1+1']]),
    '\uFEFF"Descrição";"Nome"\r\n"""mercado""; compra";"\u0027=1+1"'
  );
});
