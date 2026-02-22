const db = require('../config/database');

async function up() {
  const client = await db.pool.connect();
  
  try {
    console.log('Ejecutando migración: Agregar stock, fabricante y fecha actualización precio...');
    
    await client.query('BEGIN');

    // Agregar la columna stock de nuevo si no existe
    await client.query(`
      ALTER TABLE productos 
      ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0 CHECK (stock >= 0)
    `);

    // Agregar columna fabricante (opcional)
    await client.query(`
      ALTER TABLE productos 
      ADD COLUMN IF NOT EXISTS fabricante VARCHAR(255)
    `);

    // Agregar columna para fecha de última actualización de precio
    await client.query(`
      ALTER TABLE productos 
      ADD COLUMN IF NOT EXISTS precio_actualizado_at TIMESTAMP
    `);

    await client.query('COMMIT');
    
    console.log('✓ Migración completada: stock, fabricante y precio_actualizado_at agregados');
    
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
      DROP COLUMN IF EXISTS precio_actualizado_at
    `);

    await client.query(`
      ALTER TABLE productos 
      DROP COLUMN IF EXISTS fabricante
    `);

    await client.query(`
      ALTER TABLE productos 
      DROP CONSTRAINT IF EXISTS productos_stock_check
    `);

    await client.query(`
      ALTER TABLE productos 
      DROP COLUMN IF EXISTS stock
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
