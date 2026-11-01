const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// Crear archivo de log
const logPath = path.join(app.getPath('userData'), 'app.log');
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  try {
    fs.appendFileSync(logPath, logMessage);
  } catch (e) {
    console.error('Error escribiendo log:', e);
  }
}

log(`=== INICIANDO APLICACION ===`);
log(`Log path: ${logPath}`);
log(`App path: ${app.getAppPath()}`);
log(`Is packaged: ${app.isPackaged}`);

// Establecer modo Electron
process.env.ELECTRON_MODE = 'true';
process.env.PORT = '3000';

let mainWindow;
let server;

function getFrontendIndexPath() {
  return path.join(app.getAppPath(), 'frontend', 'dist', 'index.html');
}

function ensureFrontendBuiltOrThrow() {
  const indexPath = getFrontendIndexPath();
  if (fs.existsSync(indexPath)) {
    log(`Frontend index encontrado: ${indexPath}`);
    return;
  }

  const message = [
    'No se encontro el frontend compilado (pantalla blanca).',
    '',
    `Falta: ${indexPath}`,
    '',
    'Solucion:',
    '1) Ejecutar: npm run build:frontend',
    '2) Luego:   npm start',
  ].join('\n');

  log(message);
  throw new Error(message);
}

// Liberar el puerto si esta ocupado — busca solo procesos en LISTENING en ese puerto exacto
function liberarPuerto(port) {
  try {
    // findstr /R busca con regex: solo líneas con ":3000 " o ":3000\t" seguido de espacios hasta LISTENING
    const result = execSync(
      `netstat -ano | findstr /R "[:][${String(port)[0]}-${String(port)[0]}]"`,
      { timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
    ).toString();

    const pids = new Set();
    for (const line of result.trim().split('\n')) {
      // Solo procesar líneas con LISTENING
      if (!line.toUpperCase().includes('LISTENING')) continue;
      // Verificar que el puerto sea exactamente el buscado (evitar ej: 30000 cuando buscamos 3000)
      const portPattern = new RegExp(`[.:]${port}\\s`);
      if (!portPattern.test(line)) continue;
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && pid !== '0' && /^\d+$/.test(pid)) {
        pids.add(pid);
      }
    }

    if (pids.size === 0) {
      log(`Puerto ${port}: ningún proceso en LISTENING encontrado`);
      return;
    }

    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] });
        log(`Puerto ${port} liberado (PID ${pid} terminado)`);
      } catch (e) {
        log(`No se pudo terminar PID ${pid}: ${e.message}`);
      }
    }

    // Esperar un momento para que el OS libere el puerto antes del próximo intento
    // (tras hibernación/sleep el OS puede tardar más en soltar el socket)
    try { execSync('ping 127.0.0.1 -n 4 > nul', { timeout: 6000 }); } catch { /* noop */ }

  } catch (e) {
    log(`Puerto ${port} disponible o no se pudo verificar: ${e.message}`);
  }
}

function startBackend() {
  return new Promise((resolve, reject) => {
    const MAX_INTENTOS = 7;
    const backendPath = path.join(app.getAppPath(), 'backend', 'server.js');

    // Delays crecientes: le da más tiempo al OS/disco en cada reintento
    // (útil tras hibernación, sleep prolongado, o disco HDD lento)
    const delays = [1200, 1500, 2000, 2500, 3000, 4000, 5000];

    const limpiarCacheBackend = () => {
      try {
        // Limpiar el módulo principal y sus dependencias directas para que
        // un require fresco re-inicialice la conexión a la DB
        const resolvedPath = require.resolve(backendPath);
        delete require.cache[resolvedPath];
        // También limpiar el módulo de database por si la conexión SQLite quedó rota
        const dbPath = require.resolve(path.join(app.getAppPath(), 'backend', 'config', 'database.js'));
        delete require.cache[dbPath];
        try {
          const sqlitePath = require.resolve(path.join(app.getAppPath(), 'backend', 'config', 'database-sqlite.js'));
          delete require.cache[sqlitePath];
        } catch { /* puede no existir si es modo web */ }
      } catch (e) {
        log(`Advertencia limpiando caché: ${e.message}`);
      }
    };

    const intentar = (intento) => {
      const delay = delays[Math.min(intento - 1, delays.length - 1)];
      log(`Iniciando backend (intento ${intento}/${MAX_INTENTOS})...`);
      try {
        limpiarCacheBackend();
        const backendApp = require(backendPath);
        log('Backend importado correctamente');

        const s = backendApp.listen(3000, () => {
          log(`Backend corriendo en puerto 3000 (intento ${intento})`);
          server = s;
          resolve();
        });

        s.on('error', (err) => {
          log(`Error en intento ${intento}: ${err.message}`);
          if (intento < MAX_INTENTOS) {
            if (err.code === 'EADDRINUSE') {
              log(`Puerto 3000 ocupado — liberando...`);
              liberarPuerto(3000);
            }
            log(`Reintentando en ${delay}ms...`);
            setTimeout(() => intentar(intento + 1), delay);
          } else {
            reject(new Error(
              err.code === 'EADDRINUSE'
                ? `El puerto 3000 sigue ocupado luego de ${MAX_INTENTOS} intentos.\nCerrá otras instancias de la aplicación o reiniciá la computadora.`
                : `No se pudo iniciar el backend luego de ${MAX_INTENTOS} intentos: ${err.message}`
            ));
          }
        });

      } catch (error) {
        log(`Error al importar backend en intento ${intento}: ${error.message}\n${error.stack}`);
        if (intento < MAX_INTENTOS) {
          log(`Reintentando en ${delay}ms...`);
          setTimeout(() => intentar(intento + 1), delay);
        } else {
          reject(new Error(`No se pudo cargar el backend luego de ${MAX_INTENTOS} intentos: ${error.message}`));
        }
      }
    };

    // Intentar liberar el puerto antes del primer intento y dar tiempo al OS
    liberarPuerto(3000);
    setTimeout(() => intentar(1), 800);
  });
}

function createWindow() {
  log('Creando ventana principal...');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    },
    autoHideMenuBar: true,
    title: 'Mielissimo',
    backgroundColor: '#f5f5f5'
  });

  mainWindow.webContents.on('console-message', (event, level, message) => {
    log(`Renderer [${level}]: ${message}`);
  });

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    log(`Renderer caido: reason=${details.reason} exitCode=${details.exitCode}`);
  });

  mainWindow.webContents.on('did-start-loading', () => {
    log('Renderer: did-start-loading');
  });

  mainWindow.webContents.on('did-finish-load', () => {
    log('Renderer: did-finish-load');
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    log(`Error cargando: ${errorCode} ${errorDescription} ${validatedURL}`);
    if (errorCode !== -3) {
      dialog.showErrorBox('Error de Carga', `No se pudo cargar la aplicacion:\n\nCodigo: ${errorCode}\nDescripcion: ${errorDescription}`);
    }
  });

  const url = 'http://localhost:3000/';
  log(`Cargando desde: ${url}`);
  mainWindow.loadURL(url).then(() => {
    log('Aplicacion cargada exitosamente');
  }).catch((err) => {
    log(`Error cargando aplicacion: ${err.message}`);
  });

  // En desarrollo, abrir DevTools para ver errores reales (evita “pantalla blanca silenciosa”)
  if (!app.isPackaged) {
    mainWindow.webContents.once('dom-ready', () => {
      try { mainWindow.webContents.openDevTools({ mode: 'detach' }); } catch {}
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(async () => {
  try {
    ensureFrontendBuiltOrThrow();
    await startBackend();
    createWindow();
  } catch (error) {
    log(`Error fatal al iniciar: ${error.message}`);
    dialog.showErrorBox('Error al Iniciar', `No se pudo iniciar el servidor backend:\n\n${error.message}\n\nIntente cerrar otras instancias de la aplicacion.`);
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (server) { server.close(); }
  if (process.platform !== 'darwin') { app.quit(); }
});

app.on('before-quit', () => {
  if (server) { server.close(); }
});

process.on('uncaughtException', (error) => {
  log(`Error no capturado: ${error.message}\n${error.stack}`);
});

process.on('unhandledRejection', (reason) => {
  log(`Promesa rechazada: ${reason}`);
});