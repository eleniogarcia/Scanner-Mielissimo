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

// Habilitar claves foráneas
db.pragma('foreign_keys = ON');

console.log(`✓ Base de datos SQLite conectada en: ${dbPath}`);

// Función para ejecutar queries de manera compatible con PostgreSQL
function query(sql, params = []) {
  try {
    // Reemplazar placeholders de PostgreSQL ($1, $2) por ? de SQLite
    let sqliteSql = sql;
    let sqliteParams = [...params];
    
    // Convertir $1, $2, etc. a ?
    const placeholderMatches = sql.match(/\$\d+/g);
    if (placeholderMatches) {
      const maxIndex = Math.max(...placeholderMatches.map(p => parseInt(p.substring(1))));
      sqliteSql = sql;
      for (let i = maxIndex; i >= 1; i--) {
        sqliteSql = sqliteSql.replace(new RegExp(`\\$${i}\\b`, 'g'), '?');
      }
    }
    
    // Convertir NOW() a CURRENT_TIMESTAMP
    sqliteSql = sqliteSql.replace(/NOW\(\)/gi, 'CURRENT_TIMESTAMP');
    
    // Convertir RETURNING * para INSERT/UPDATE
    const hasReturning = /RETURNING \*/i.test(sqliteSql);
    
    if (sqliteSql.trim().toUpperCase().startsWith('SELECT')) {
      const stmt = db.prepare(sqliteSql);
      return { rows: stmt.all(...sqliteParams) };
    } else if (sqliteSql.trim().toUpperCase().startsWith('INSERT') && hasReturning) {
      const sqlWithoutReturning = sqliteSql.replace(/RETURNING \*/i, '');
      const stmt = db.prepare(sqlWithoutReturning);
      const result = stmt.run(...sqliteParams);
      const lastId = result.lastInsertRowid;
      const tableName = sqliteSql.match(/INSERT INTO (\w+)/i)[1];
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
      const sqlWithoutReturning = sqliteSql.replace(/RETURNING \*/i, '');
      const stmt = db.prepare(sqlWithoutReturning);
      stmt.run(...sqliteParams);
      const tableName = sqliteSql.match(/UPDATE (\w+)/i)[1];
      const selectStmt = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`);
      return { rows: [selectStmt.get(id)] };
    } else if (sqliteSql.trim().toUpperCase().startsWith('DELETE') && hasReturning) {
      const match = sqliteSql.match(/WHERE id = \?/i);
      let id;
      if (match) {
        id = sqliteParams[0];
      }
      const tableName = sqliteSql.match(/DELETE FROM (\w+)/i)[1];
      const selectStmt = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`);
      const row = selectStmt.get(id);
      const sqlWithoutReturning = sqliteSql.replace(/RETURNING \*/i, '');
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
