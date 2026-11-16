// Pool de conexões com o MySQL (interface de promises do mysql2).
// Com pool, cada consulta pega uma conexão livre e a devolve ao terminar,
// em vez de todas as requisições disputarem uma única conexão.
const mysql = require('mysql2/promise');
const { banco } = require('./ambiente');

const pool = mysql.createPool({
  ...banco,
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true, // DATE e DATETIME chegam como texto ('2026-11-16'), sem conversão de fuso
  decimalNumbers: false, // DECIMAL chega como texto ('100.00') para não perder precisão
});

module.exports = pool;
