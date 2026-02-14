require('dotenv').config();
const { createTables } = require('./001_initial');
const { up: removeStock } = require('./002_remove_stock');
const { pool } = require('../config/database');

async function runMigrations() {
  try {
    console.log('🚀 Ejecutando migraciones...\n');
    
    // Migración 001: Crear tablas iniciales (solo si no existen)
    await createTables();
    
    // Migración 002: Eliminar columna stock
    await removeStock();
    
    console.log('\n✅ Todas las migraciones completadas');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error ejecutando migraciones:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
