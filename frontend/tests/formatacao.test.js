import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatarData,
  mascararCpf,
  periodoDoMes,
  periodoUltimosMeses,
} from '../src/services/formatacao.js';

const hoje = new Date(2026, 10, 22); // 22/11/2026

test('formatarData converte para o padrão brasileiro', () => {
  assert.equal(formatarData('2026-11-03'), '03/11/2026');
  assert.equal(formatarData(null), '—');
});

test('máscara de CPF', () => {
  assert.equal(mascararCpf('52998224725'), '529.982.247-25');
  assert.equal(mascararCpf('529982'), '529.982');
  assert.equal(mascararCpf('529.982.247-25999'), '529.982.247-25');
});

test('períodos do mês e dos últimos meses', () => {
  assert.deepEqual(periodoDoMes(0, hoje), { inicio: '2026-11-01', fim: '2026-11-30' });
  assert.deepEqual(periodoDoMes(-1, hoje), { inicio: '2026-10-01', fim: '2026-10-31' });
  assert.deepEqual(periodoDoMes(-10, hoje), { inicio: '2026-01-01', fim: '2026-01-31' });
  assert.deepEqual(periodoUltimosMeses(3, hoje), { inicio: '2026-09-01', fim: '2026-11-30' });
});
