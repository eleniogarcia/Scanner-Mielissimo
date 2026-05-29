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

// Liberar el puerto si esta ocupado
function liberarPuerto(port) {
  try {
    const result = execSync(`netstat -ano | findstr :${port}`).toString();
    const lines = result.trim().split('\n');
    for (const line of lines) {
      if (!line.includes('LISTENING') && !line.includes(':' + port + ' ')) continue;
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && pid !== '0' && !isNaN(pid)) {
        try {
          execSync(`taskkill /PID ${pid} /F`);
          log(`Puerto ${port} liberado (PID ${pid} terminado)`);
        } catch (e) {
          log(`No se pudo terminar PID ${pid}: ${e.message}`);
        }
      }
    }
  } catch (e) {
    log(`Puerto ${port} libre`);
  }
}

function startBackend() {
  return new Promise((resolve, reject) => {
    try {
      log('Iniciando backend...');

      liberarPuerto(3000);

      const backendPath = path.join(app.getAppPath(), 'backend', 'server.js');
      delete require.cache[backendPath];
      const backendApp = require(backendPath);

      log('Backend importado correctamente');

      server = backendApp.listen(3000, () => {
        log('Backend corriendo en puerto 3000');
        resolve();
      });

      server.on('error', (err) => {
        log(`Error del servidor: ${err.message}`);
        if (err.code === 'EADDRINUSE') {
          log('Puerto ocupado, reintentando en 800ms...');
          liberarPuerto(3000);
          setTimeout(() => {
            const s2 = backendApp.listen(3000, () => {
              log('Backend corriendo en puerto 3000 (reintento)');
              server = s2;
              resolve();
            });
            s2.on('error', (err2) => {
              log(`Error en reintento: ${err2.message}`);
              reject(err2);
            });
          }, 800);
        } else {
          reject(err);
        }
      });

    } catch (error) {
      log(`Error al iniciar backend: ${error.message}\n${error.stack}`);
      reject(error);
    }
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
