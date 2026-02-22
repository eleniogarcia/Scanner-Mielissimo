const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

// Establecer modo Electron
process.env.ELECTRON_MODE = 'true';

let mainWindow;
let backendProcess;

function startBackend() {
  console.log('Iniciando servidor backend...');
  
  const backendPath = app.isPackaged
    ? path.join(process.resourcesPath, 'backend', 'server.js')
    : path.join(__dirname, 'backend', 'server.js');

  backendProcess = spawn('node', [backendPath], {
    env: { 
      ...process.env, 
      ELECTRON_MODE: 'true',
      NODE_ENV: 'production'
    },
    stdio: 'inherit'
  });

  backendProcess.on('error', (err) => {
    console.error('Error al iniciar backend:', err);
  });

  backendProcess.on('close', (code) => {
    console.log(`Backend cerrado con código ${code}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    },
    autoHideMenuBar: true,
    title: 'Mielissimo POS',
    backgroundColor: '#f5f5f5'
  });

  // Cargar la aplicación
  if (app.isPackaged) {
    // En producción, cargar desde archivos estáticos
    mainWindow.loadFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
  } else {
    // En desarrollo, cargar desde servidor de Vite
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Manejar links externos
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  startBackend();
  
  // Esperar a que el backend esté listo
  setTimeout(() => {
    createWindow();
  }, 2000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});

// Manejar errores no capturados
process.on('uncaughtException', (error) => {
  console.error('Error no capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Promesa rechazada no manejada:', reason);
});
