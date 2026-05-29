const db = require('../config/database');

async function up() {
  const isElectron = process.env.ELECTRON_MODE === 'true' || process.env.npm_package_name === 'mielissimo-pos';

  if (isElectron) {
    // SQLite: no soporta ALTER COLUMN, hay que recrear la tabla
    db.db.exec(`
      PRAGMA foreign_keys = OFF;

      CREATE TABLE IF NOT EXISTS venta_items_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        venta_id INTEGER NOT NULL,
        producto_id INTEGER,
        producto_nombre TEXT NOT NULL,
        producto_codigo TEXT,
        cantidad INTEGER NOT NULL,
        precio_unitario REAL NOT NULL,
        subtotal REAL NOT NULL,
        created_at TEXT DEFAULT (datetime('now', '-3 hours')),
        FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
        FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE SET NULL
      );

      INSERT INTO venta_items_new SELECT * FROM venta_items;
      DROP TABLE venta_items;
      ALTER TABLE venta_items_new RENAME TO venta_items;

      PRAGMA foreign_keys = ON;
    `);
    console.log('✓ SQLite: producto_id ahora es nullable en venta_items');
  } else {
    // PostgreSQL — idempotente: solo actúa si la columna aún tiene NOT NULL
    try {
      await db.query(`
        ALTER TABLE venta_items
          ALTER COLUMN producto_id DROP NOT NULL,
          DROP CONSTRAINT IF EXISTS venta_items_producto_id_fkey;
      `);
      await db.query(`
        ALTER TABLE venta_items
          ADD CONSTRAINT venta_items_producto_id_fkey
          FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE SET NULL;
      `);
      console.log('✓ PostgreSQL: producto_id ahora es nullable en venta_items');
    } catch (e) {
      if (e.message && e.message.includes('already nullable')) {
        console.log('ℹ️  Migration 005 ya aplicada (producto_id ya es nullable)');
      } else {
        throw e;
      }
    }
  }
}

module.exports = { up };

// Ejecutar solo si se llama directamente
if (require.main === module) {
  up().then(() => {
    console.log('Migración 005 completada');
    process.exit(0);
  }).catch(err => {
    console.error('Error en migración 005:', err);
    process.exit(1);
  });
}
