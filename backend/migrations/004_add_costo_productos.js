const db = require('../config/database');

async function up() {
  const client = await db.pool.connect();
  
  try {
    console.log('Ejecutando migración: Agregar costo a productos...');
    
    await client.query('BEGIN');

    // Agregar columna costo (opcional)
    await client.query(`
      ALTER TABLE productos 
      ADD COLUMN IF NOT EXISTS costo DECIMAL(10, 2) DEFAULT 0 CHECK (costo >= 0)
    `);

    await client.query('COMMIT');
    
    console.log('✓ Migración completada: costo agregado a productos');
    
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
    console.log('Revirtiendo migración...');
    
    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE productos 
      DROP COLUMN IF EXISTS costo
    `);

    await client.query('COMMIT');
    
    console.log('✓ Migración revertida');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al revertir migración:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { up, down };
