require('dotenv').config();

// Detectar si estamos en modo Electron (aplicación de escritorio)
const isElectronMode = process.env.ELECTRON_MODE === 'true' || process.env.npm_package_name === 'mielissimo-pos';

if (isElectronMode) {
  // Usar SQLite para aplicación de escritorio
  console.log('🗄️  Modo Electron detectado - Usando SQLite');
  module.exports = require('./database-sqlite');
} else {
  // Usar PostgreSQL para web
  console.log('🗄️  Modo Web - Usando PostgreSQL');
  const { Pool, types } = require('pg');

  // Evitar que pg convierta TIMESTAMP WITHOUT TIME ZONE usando la zona horaria
  // local de la máquina. Se devuelven como string tal cual están en la DB.
  // OID 1114 = TIMESTAMP WITHOUT TIME ZONE
  types.setTypeParser(1114, (str) => str);

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false
    } : false
  });

  pool.on('error', (err) => {
    console.error('Error inesperado en el pool de PostgreSQL:', err);
    process.exit(-1);
  });

  module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
  };
}
