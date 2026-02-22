const { db } = require('./config/database-sqlite');

console.log('Creando tablas en SQLite...');

// Eliminar tablas si existen
db.exec(`DROP TABLE IF EXISTS venta_items`);
db.exec(`DROP TABLE IF EXISTS ventas`);
db.exec(`DROP TABLE IF EXISTS productos`);

// Crear tabla productos
db.exec(`
  CREATE TABLE productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    codigo TEXT UNIQUE,
    precio REAL NOT NULL CHECK (precio >= 0),
    costo REAL DEFAULT 0 CHECK (costo >= 0),
    stock INTEGER DEFAULT 0 CHECK (stock >= 0),
    fabricante TEXT,
    precio_actualizado_at TEXT DEFAULT CURRENT_TIMESTAMP,
    activo INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

// Crear tabla ventas
db.exec(`
  CREATE TABLE ventas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    total REAL NOT NULL,
    items_count INTEGER NOT NULL,
    metodo_pago TEXT DEFAULT 'efectivo',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

// Crear tabla venta_items
db.exec(`
  CREATE TABLE venta_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venta_id INTEGER NOT NULL,
    producto_id INTEGER,
    producto_nombre TEXT NOT NULL,
    producto_codigo TEXT,
    cantidad INTEGER NOT NULL,
    precio_unitario REAL NOT NULL,
    subtotal REAL NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE SET NULL
  )
`);

// Crear índices
db.exec(`CREATE INDEX idx_productos_codigo ON productos(codigo)`);
db.exec(`CREATE INDEX idx_productos_activo ON productos(activo)`);
db.exec(`CREATE INDEX idx_ventas_fecha ON ventas(created_at)`);
db.exec(`CREATE INDEX idx_venta_items_venta ON venta_items(venta_id)`);
db.exec(`CREATE INDEX idx_venta_items_producto ON venta_items(producto_id)`);

console.log('✓ Tablas creadas exitosamente');

// Insertar productos de ejemplo (opcional)
const insertProducto = db.prepare(`
  INSERT INTO productos (nombre, codigo, precio, costo, stock, fabricante)
  VALUES (?, ?, ?, ?, ?, ?)
`);

insertProducto.run('Miel Pura 500g', '7793592620019', 1500, 800, 50, 'Mielissimo');
insertProducto.run('Miel Orgánica 1kg', '7793592620026', 2800, 1500, 30, 'Mielissimo');
insertProducto.run('Polen Natural 100g', '7793592620033', 900, 500, 40, 'Mielissimo');

console.log('✓ Productos de ejemplo insertados');
console.log('\n✅ Base de datos SQLite lista para usar');
console.log('\nLa base de datos se guardó en:');
console.log(require('path').join(process.env.APPDATA || process.env.HOME, 'MielissimoPOS', 'mielissimo.db'));
