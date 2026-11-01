const db = require('../config/database');

async function up() {
  const client = await db.pool.connect();

  try {
    console.log('Ejecutando migracion: integracion con la web...');

    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS configuracion (
        clave VARCHAR(100) PRIMARY KEY,
        valor TEXT
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS web_sync (
        producto_id INTEGER PRIMARY KEY REFERENCES productos(id) ON DELETE CASCADE,
        accion VARCHAR(20) NOT NULL,
        categoria_id INTEGER,
        stock_evento VARCHAR(20),
        intentos INTEGER NOT NULL DEFAULT 0,
        ultimo_error TEXT,
        updated_at TIMESTAMP
      )
    `);

    await client.query(`ALTER TABLE productos ADD COLUMN IF NOT EXISTS web_producto_id INTEGER`);

    await client.query('COMMIT');
    console.log('✓ Migracion completada: integracion con la web');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en migracion:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { up };
