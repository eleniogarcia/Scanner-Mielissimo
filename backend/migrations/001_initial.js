const db = require('../config/database');

async function createTables() {
  try {
    console.log('Iniciando migración de base de datos...');

    // Tabla de productos
    await db.query(`
      CREATE TABLE IF NOT EXISTS productos (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        codigo VARCHAR(255) UNIQUE,
        precio DECIMAL(10, 2) NOT NULL CHECK (precio >= 0),
        fecha_vencimiento DATE,
        stock INTEGER DEFAULT 0 CHECK (stock >= 0),
        activo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de ventas
    await db.query(`
      CREATE TABLE IF NOT EXISTS ventas (
        id SERIAL PRIMARY KEY,
        total DECIMAL(10, 2) NOT NULL CHECK (total >= 0),
        items_count INTEGER NOT NULL DEFAULT 0,
        metodo_pago VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de items de venta
    await db.query(`
      CREATE TABLE IF NOT EXISTS venta_items (
        id SERIAL PRIMARY KEY,
        venta_id INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
        producto_id INTEGER REFERENCES productos(id) ON DELETE SET NULL,
        producto_nombre VARCHAR(255) NOT NULL,
        producto_codigo VARCHAR(255),
        cantidad INTEGER NOT NULL CHECK (cantidad > 0),
        precio_unitario DECIMAL(10, 2) NOT NULL CHECK (precio_unitario >= 0),
        subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Índices para mejorar el rendimiento
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_productos_codigo ON productos(codigo);
      CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos(activo);
      CREATE INDEX IF NOT EXISTS idx_productos_fecha_vencimiento ON productos(fecha_vencimiento);
      CREATE INDEX IF NOT EXISTS idx_ventas_created ON ventas(created_at);
      CREATE INDEX IF NOT EXISTS idx_venta_items_venta ON venta_items(venta_id);
    `);

    console.log('✓ Tablas creadas exitosamente');
    
    // Insertar productos de ejemplo
    const productosEjemplo = [
      { nombre: 'Coca Cola 500ml', codigo: '7501234567890', precio: 15.00, stock: 100 },
      { nombre: 'Pan Integral', codigo: '7501234567891', precio: 32.50, stock: 50 },
      { nombre: 'Leche Lala 1L', codigo: '7501234567892', precio: 22.00, stock: 75 },
      { nombre: 'Agua Bonafont 1.5L', codigo: '7501234567893', precio: 12.00, stock: 200 },
      { nombre: 'Galletas Marías', codigo: '7501234567894', precio: 18.50, stock: 60 }
    ];

    for (const producto of productosEjemplo) {
      await db.query(
        `INSERT INTO productos (nombre, codigo, precio, stock, activo) 
         VALUES ($1, $2, $3, $4, true) 
         ON CONFLICT (codigo) DO NOTHING`,
        [producto.nombre, producto.codigo, producto.precio, producto.stock]
      );
    }

    console.log('✓ Productos de ejemplo insertados');
    console.log('✓ Migración completada exitosamente');

  } catch (error) {
    console.error('Error en migración:', error);
    throw error;
  }
}

module.exports = { createTables };
