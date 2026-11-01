const db = require('../config/database');

async function up() {
  const client = await db.pool.connect();

  try {
    console.log('Ejecutando migracion: caja, movimientos de caja y gastos...');

    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS cajas (
        id SERIAL PRIMARY KEY,
        estado VARCHAR(20) NOT NULL DEFAULT 'abierta',
        monto_inicial DECIMAL(12, 2) NOT NULL DEFAULT 0,
        abierta_at TIMESTAMP NOT NULL,
        cerrada_at TIMESTAMP,
        observaciones TEXT,
        observaciones_cierre TEXT,
        monto_contado DECIMAL(12, 2),
        efectivo_esperado DECIMAL(12, 2),
        diferencia DECIMAL(12, 2),
        cantidad_ventas INTEGER,
        total_ventas DECIMAL(12, 2),
        ventas_efectivo DECIMAL(12, 2),
        ventas_tarjeta DECIMAL(12, 2),
        ventas_transferencia DECIMAL(12, 2),
        ingresos DECIMAL(12, 2),
        retiros DECIMAL(12, 2)
      )
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_cajas_una_abierta ON cajas(estado) WHERE estado = 'abierta'
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS gastos (
        id SERIAL PRIMARY KEY,
        fecha VARCHAR(10) NOT NULL,
        monto DECIMAL(12, 2) NOT NULL CHECK (monto > 0),
        categoria VARCHAR(50) NOT NULL DEFAULT 'otros',
        descripcion TEXT,
        caja_id INTEGER REFERENCES cajas(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_gastos_fecha ON gastos(fecha)`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS caja_movimientos (
        id SERIAL PRIMARY KEY,
        caja_id INTEGER NOT NULL REFERENCES cajas(id) ON DELETE CASCADE,
        tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('ingreso', 'retiro')),
        monto DECIMAL(12, 2) NOT NULL CHECK (monto > 0),
        motivo TEXT,
        gasto_id INTEGER REFERENCES gastos(id) ON DELETE SET NULL,
        created_at TIMESTAMP NOT NULL
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_caja_movimientos_caja ON caja_movimientos(caja_id)`);

    await client.query(`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(50)`);
    await client.query(`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS caja_id INTEGER REFERENCES cajas(id) ON DELETE SET NULL`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ventas_caja ON ventas(caja_id)`);

    await client.query('COMMIT');
    console.log('✓ Migracion completada: caja y gastos');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en migracion:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { up };
