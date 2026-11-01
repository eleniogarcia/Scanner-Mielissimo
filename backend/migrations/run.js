require('dotenv').config();
const { createTables } = require('./001_initial');
const { up: removeStock } = require('./002_remove_stock');
const { up: addStockFabricantePrecio } = require('./003_add_stock_fabricante_precio_updated');
const { up: addCosto } = require('./004_add_costo_productos');
const { up: makeProductoIdNullable } = require('./005_nullable_producto_id');
const { up: addFechaVencimiento } = require('./006_add_fecha_vencimiento_productos');
const { up: addCajaYGastos } = require('./007_caja_y_gastos');
const { pool } = require('../config/database');

async function runMigrations() {
  try {
    console.log('🚀 Ejecutando migraciones...\n');
    
    // Migración 001: Crear tablas iniciales (solo si no existen)
    await createTables();
    
    // Migración 002: Eliminar columna stock
    await removeStock();
    
    // Migración 003: Agregar stock, fabricante y precio_actualizado_at
    await addStockFabricantePrecio();
    
    // Migración 004: Agregar costo a productos
    await addCosto();

    // Migración 005: producto_id nullable en venta_items (para productos especiales)
    await makeProductoIdNullable();

    // Migración 006: fecha de vencimiento en productos
    await addFechaVencimiento();

    // Migración 007: caja (apertura/cierre), movimientos y gastos
    await addCajaYGastos();
    
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
