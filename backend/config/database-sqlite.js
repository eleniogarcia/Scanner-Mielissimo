const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ruta donde se guardará la base de datos
const dbDir = path.join(process.env.APPDATA || process.env.HOME, 'MielissimoPOS');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'mielissimo.db');
const db = new Database(dbPath);

// Pragmas de rendimiento ─ hacen la diferencia en disco lento / HDD
db.pragma('journal_mode = WAL');      // Escrituras sin bloquear lecturas (5-10x más rápido en HDD)
db.pragma('synchronous = NORMAL');    // Seguro y mucho más rápido que FULL
db.pragma('cache_size = -8000');      // 8 MB de caché en memoria
db.pragma('temp_store = MEMORY');     // Tablas temporales en RAM
db.pragma('foreign_keys = ON');

console.log(`✓ Base de datos SQLite conectada en: ${dbPath}`);

// Auto-inicializar tablas si no existen (primer arranque o nueva instalación)
function initTablesIfNotExist() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      codigo TEXT UNIQUE,
      precio REAL NOT NULL CHECK (precio >= 0),
      costo REAL DEFAULT 0 CHECK (costo >= 0),
      fecha_vencimiento TEXT,
      stock INTEGER DEFAULT 0 CHECK (stock >= 0),
      fabricante TEXT,
      precio_actualizado_at TEXT DEFAULT (datetime('now', '-3 hours')),
      activo INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now', '-3 hours')),
      updated_at TEXT DEFAULT (datetime('now', '-3 hours'))
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS ventas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      total REAL NOT NULL,
      items_count INTEGER NOT NULL,
      metodo_pago TEXT DEFAULT 'efectivo',
      created_at TEXT DEFAULT (datetime('now', '-3 hours'))
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS venta_items (
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
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_productos_codigo ON productos(codigo)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos(activo)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(created_at)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_venta_items_venta ON venta_items(venta_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_venta_items_producto ON venta_items(producto_id)`);

  // Para instalaciones existentes, agregar columnas nuevas en forma incremental.
  const columns = db.prepare("PRAGMA table_info(productos)").all().map(col => col.name);
  if (!columns.includes('fecha_vencimiento')) {
    db.exec('ALTER TABLE productos ADD COLUMN fecha_vencimiento TEXT');
  }
  db.exec(`CREATE INDEX IF NOT EXISTS idx_productos_fecha_vencimiento ON productos(fecha_vencimiento)`);
  console.log('✓ Tablas SQLite verificadas');
}

try { initTablesIfNotExist(); } catch(e) { console.error('Error inicializando tablas:', e.message); }

// Regex pre-compiladas a nivel módulo — no crear new RegExp() en cada query
const RE_PLACEHOLDER  = /\$\d+/g;
const RE_NOW          = /NOW\(\)/gi;
const RE_INTERVAL_DATE = /CURRENT_DATE\s*-\s*INTERVAL\s*'(\d+)\s+(\w+)'/gi;
const RE_INTERVAL_TS   = /CURRENT_TIMESTAMP\s*-\s*INTERVAL\s*'(\d+)\s+(\w+)'/gi;
const RE_INTERVAL_DT   = /datetime\('now'\)\s*-\s*INTERVAL\s*'(\d+)\s+(\w+)'/gi;
const RE_CURRENT_DATE  = /\bCURRENT_DATE\b/g;  // Standalone, después de que RE_INTERVAL_DATE haya reemplazado sus ocurrencias
const RE_ILIKE         = /\bILIKE\b/gi;
const RE_RETURNING     = /RETURNING \*/i;
const RE_INSERT_TABLE  = /INSERT INTO (\w+)/i;
const RE_UPDATE_TABLE  = /UPDATE (\w+)/i;
const RE_DELETE_TABLE  = /DELETE FROM (\w+)/i;

// Función para ejecutar queries de manera compatible con PostgreSQL
function query(sql, params = []) {
  try {
    let sqliteSql = sql;
    let sqliteParams = params.map(p => (typeof p === 'boolean' ? (p ? 1 : 0) : p));

    // Convertir $1, $2, etc. a ?
    const placeholderMatches = sql.match(RE_PLACEHOLDER);
    if (placeholderMatches) {
      const maxIndex = Math.max(...placeholderMatches.map(p => parseInt(p.substring(1))));
      for (let i = maxIndex; i >= 1; i--) {
        sqliteSql = sqliteSql.replace(new RegExp(`\\$${i}\\b`, 'g'), '?');
      }
    }

    // Argentina es UTC-3 (sin horario de verano)
    const RE_CURRENT_TIMESTAMP = /\bCURRENT_TIMESTAMP\b/g;

    sqliteSql = sqliteSql
      .replace(RE_NOW, "datetime('now', '-3 hours')")
      .replace(RE_CURRENT_TIMESTAMP, "datetime('now', '-3 hours')")
      .replace(RE_INTERVAL_DATE, (_, n, unit) => `date('now', '-3 hours', '-${n} ${unit}')`)
      .replace(RE_INTERVAL_TS,   (_, n, unit) => `datetime('now', '-3 hours', '-${n} ${unit}')`)
      .replace(RE_INTERVAL_DT,   (_, n, unit) => `datetime('now', '-3 hours', '-${n} ${unit}')`)
      .replace(RE_CURRENT_DATE,  "date('now', '-3 hours')")
      .replace(RE_ILIKE, 'LIKE');

    const hasReturning = RE_RETURNING.test(sqliteSql);

    if (sqliteSql.trim().toUpperCase().startsWith('SELECT')) {
      const stmt = db.prepare(sqliteSql);
      return { rows: stmt.all(...sqliteParams) };
    } else if (sqliteSql.trim().toUpperCase().startsWith('INSERT') && hasReturning) {
      const sqlWithoutReturning = sqliteSql.replace(RE_RETURNING, '');
      const stmt = db.prepare(sqlWithoutReturning);
      const result = stmt.run(...sqliteParams);
      const lastId = result.lastInsertRowid;
      const tableName = sqliteSql.match(RE_INSERT_TABLE)[1];
      const selectStmt = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`);
      return { rows: [selectStmt.get(lastId)] };
    } else if (sqliteSql.trim().toUpperCase().startsWith('UPDATE') && hasReturning) {
      const match = sqliteSql.match(/WHERE id = \?/i);
      let id;
      if (match) {
        const whereIndex = sqliteSql.indexOf('WHERE');
        const questionMarks = (sqliteSql.substring(0, whereIndex).match(/\?/g) || []).length;
        id = sqliteParams[questionMarks];
      }
      const sqlWithoutReturning = sqliteSql.replace(RE_RETURNING, '');
      const stmt = db.prepare(sqlWithoutReturning);
      stmt.run(...sqliteParams);
      const tableName = sqliteSql.match(RE_UPDATE_TABLE)[1];
      const selectStmt = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`);
      return { rows: [selectStmt.get(id)] };
    } else if (sqliteSql.trim().toUpperCase().startsWith('DELETE') && hasReturning) {
      const match = sqliteSql.match(/WHERE id = \?/i);
      let id;
      if (match) {
        id = sqliteParams[0];
      }
      const tableName = sqliteSql.match(RE_DELETE_TABLE)[1];
      const selectStmt = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`);
      const row = selectStmt.get(id);
      const sqlWithoutReturning = sqliteSql.replace(RE_RETURNING, '');
      const stmt = db.prepare(sqlWithoutReturning);
      stmt.run(...sqliteParams);
      return { rows: row ? [row] : [] };
    } else {
      const stmt = db.prepare(sqliteSql);
      const result = stmt.run(...sqliteParams);
      return { rows: [], rowCount: result.changes };
    }
  } catch (error) {
    console.error('Error en query:', error);
    console.error('SQL:', sql);
    console.error('Params:', params);
    throw error;
  }
}

module.exports = { db, query };
