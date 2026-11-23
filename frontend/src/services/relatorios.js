// Monta o conteúdo de um arquivo CSV (separador ";" para abrir direto no Excel em português).
// Campos que começam com = + - @ recebem um apóstrofo para não virarem fórmula na planilha.
export function serializarCsv(linhas) {
  const escaparCampo = (valor) => {
    const texto = String(valor ?? '');
    const seguro = /^[\t\r\n ]*[=+\-@]/.test(texto) ? `'${texto}` : texto;
    return `"${seguro.replace(/"/g, '""')}"`;
  };

  return `﻿${linhas
    .map((linha) => linha.map(escaparCampo).join(';'))
    .join('\r\n')}`;
}
