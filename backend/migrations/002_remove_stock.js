const db = require('../config/database');

async function up() {
  const client = await db.pool.connect();
  
  try {
    console.log('Ejecutando migración: Eliminar columna stock de productos...');
    
    await client.query('BEGIN');

    // Eliminar la restricción CHECK de stock si existe
    await client.query(`
      ALTER TABLE productos 
      DROP CONSTRAINT IF EXISTS productos_stock_check
    `);

    // Eliminar la columna stock
    await client.query(`
      ALTER TABLE productos 
      DROP COLUMN IF EXISTS stock
    `);

    await client.query('COMMIT');
    
    console.log('✓ Migración completada: Columna stock eliminada');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en migración:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function down() {
  const client = await db.pool.connect();
  
  try {
    console.log('Revirtiendo migración: Agregar columna stock...');
    
    await client.query('BEGIN');

    // Agregar la columna stock de vuelta
    await client.query(`
      ALTER TABLE productos 
      ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0 CHECK (stock >= 0)
    `);

    await client.query('COMMIT');
    
    console.log('✓ Migración revertida: Columna stock agregada');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error revirtiendo migración:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { up, down };
