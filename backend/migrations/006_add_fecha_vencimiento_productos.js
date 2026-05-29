const db = require('../config/database');

async function up() {
  const client = await db.pool.connect();

  try {
    console.log('Ejecutando migracion: Agregar fecha_vencimiento a productos...');

    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE productos
      ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_productos_fecha_vencimiento
      ON productos(fecha_vencimiento)
    `);

    await client.query('COMMIT');

    console.log('✓ Migracion completada: fecha_vencimiento agregada');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en migracion:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function down() {
  const client = await db.pool.connect();

  try {
    console.log('Revirtiendo migracion de fecha_vencimiento...');

    await client.query('BEGIN');

    await client.query('DROP INDEX IF EXISTS idx_productos_fecha_vencimiento');

    await client.query(`
      ALTER TABLE productos
      DROP COLUMN IF EXISTS fecha_vencimiento
    `);

    await client.query('COMMIT');

    console.log('✓ Migracion revertida');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al revertir migracion:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { up, down };
