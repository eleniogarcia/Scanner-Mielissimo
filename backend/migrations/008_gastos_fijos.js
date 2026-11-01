const db = require('../config/database');

async function up() {
  const client = await db.pool.connect();

  try {
    console.log('Ejecutando migracion: gastos fijos...');

    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS gastos_fijos (
        id SERIAL PRIMARY KEY,
        descripcion VARCHAR(255) NOT NULL,
        categoria VARCHAR(50) NOT NULL DEFAULT 'otros',
        monto DECIMAL(12, 2) NOT NULL CHECK (monto > 0),
        dia INTEGER NOT NULL DEFAULT 1 CHECK (dia BETWEEN 1 AND 31),
        desde VARCHAR(7) NOT NULL,
        activo BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS gastos_fijos_generados (
        gasto_fijo_id INTEGER NOT NULL REFERENCES gastos_fijos(id) ON DELETE CASCADE,
        mes VARCHAR(7) NOT NULL,
        PRIMARY KEY (gasto_fijo_id, mes)
      )
    `);

    await client.query(`
      ALTER TABLE gastos ADD COLUMN IF NOT EXISTS gasto_fijo_id INTEGER REFERENCES gastos_fijos(id) ON DELETE SET NULL
    `);

    await client.query('COMMIT');
    console.log('✓ Migracion completada: gastos fijos');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en migracion:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { up };
