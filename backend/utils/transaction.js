const db = require('../config/database');

// Ejecuta fn(query) dentro de una transacción, tanto en SQLite (escritorio) como en PostgreSQL (web).
// fn recibe una función query(sql, params) con la misma forma que db.query.
async function withTransaction(fn) {
  if (db.pool) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn((sql, params) => client.query(sql, params));
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // SQLite (better-sqlite3 es sincrónico, así que nada se intercala entre BEGIN y COMMIT)
  db.db.exec('BEGIN');
  try {
    const result = await fn(db.query);
    db.db.exec('COMMIT');
    return result;
  } catch (error) {
    db.db.exec('ROLLBACK');
    throw error;
  }
}

module.exports = { withTransaction };
