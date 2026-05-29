# 🖥️ Guía: Convertir a Aplicación de Escritorio

## 📋 Requisitos Previos

En la computadora donde vas a trabajar necesitas tener instalado:
- **Node.js** versión 16 o superior ([https://nodejs.org](https://nodejs.org))
- **Git** (opcional, para clonar el proyecto)
- Espacio en disco: ~500 MB

---

## 🚀 PASO 1: Copiar el Proyecto a la Nueva Computadora

### Opción A: Copiar la carpeta completa
1. Copia toda la carpeta `ScannerMielissimo` a una USB o disco externo
2. Pégala en la nueva computadora (ejemplo: `C:\Proyectos\ScannerMielissimo`)

### Opción B: Usar Git (si tienes repositorio)
```bash
git clone [tu-repositorio-url]
cd ScannerMielissimo
```

---

## ⚙️ PASO 2: Configurar PowerShell (IMPORTANTE)

Si recibes el error: 
- **"la ejecución de scripts está deshabilitada en este sistema"**, o
- **"no se reconoce como un comando interno o externo"**

**Significa que estás en CMD en lugar de PowerShell, o PowerShell está bloqueado.**

### ⚠️ CÓMO ABRIR POWERSHELL COMO ADMINISTRADOR (PASO A PASO):

1. **Presiona la tecla Windows** en tu teclado (la tecla con el logo de Windows)

2. **Escribe:** `powershell` (verás aparecer resultados de búsqueda)

3. **Busca "Windows PowerShell"** en los resultados (tiene un logo azul)
   - ❌ NO uses "Símbolo del sistema" o "CMD" (logo negro)
   - ✅ SÍ usa "Windows PowerShell" (logo azul)

4. **Haz clic DERECHO** sobre **"Windows PowerShell"**

5. En el menú que aparece, selecciona **"Ejecutar como administrador"**

6. Windows te preguntará si permites que la app haga cambios. Haz clic en **"Sí"**

7. Se abrirá una ventana **AZUL** (no negra). En el título debe decir **"Administrador: Windows PowerShell"**

### AHORA SÍ, EJECUTA EL COMANDO:

8. **Copia y pega este comando** en la ventana azul:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

9. Presiona **Enter**

10. Te preguntará si quieres cambiar la directiva. Escribe **S** y presiona **Enter**

11. **Verifica que funcionó** ejecutando:
    ```powershell
    Get-ExecutionPolicy
    ```
    Debe responder: `RemoteSigned`

12. **Cierra esta ventana** de PowerShell

13. **Abre PowerShell NORMAL** (sin administrador) navegando a tu carpeta del proyecto para continuar

**✅ Ahora npm install y todos los comandos funcionarán correctamente**

---

## 🔧 PASO 3: Instalar Dependencias en la Nueva Computadora

Abre **PowerShell** (normal, no como administrador) en la carpeta del proyecto:

```powershell
# Instalar dependencias del backend
cd backend
npm install

# Instalar dependencias del frontend
cd ..\frontend
npm install

# Volver a la raíz
cd ..
```

**⏱️ Tiempo estimado:** 5-10 minutos

---

## 💾 PASO 4: Cambiar de PostgreSQL a SQLite

SQLite no requiere servidor, todo se guarda en un archivo local.

### 3.1. Instalar SQLite
```powershell
cd backend
npm install sqlite3 better-sqlite3
```

### 3.2. Crear nuevo archivo de configuración de base de datos

**Crear archivo:** `backend/config/database-sqlite.js`

```javascript
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

// Función para ejecutar queries
function query(sql, params = []) {
  try {
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      const stmt = db.prepare(sql);
      return { rows: stmt.all(...params) };
    } else if (sql.trim().toUpperCase().startsWith('INSERT') && sql.includes('RETURNING')) {
      // Manejar INSERT con RETURNING
      const sqlWithoutReturning = sql.replace(/RETURNING \*/i, '');
      const stmt = db.prepare(sqlWithoutReturning);
      const result = stmt.run(...params);
      // Obtener el registro insertado
      const lastId = result.lastInsertRowid;
      const tableName = sql.match(/INSERT INTO (\w+)/i)[1];
      const selectStmt = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`);
      return { rows: [selectStmt.get(lastId)] };
    } else if (sql.trim().toUpperCase().startsWith('UPDATE') && sql.includes('RETURNING')) {
      // Manejar UPDATE con RETURNING
      const match = sql.match(/WHERE id = \$(\d+)/i);
      const idIndex = match ? parseInt(match[1]) - 1 : 0;
      const id = params[idIndex];
      const sqlWithoutReturning = sql.replace(/RETURNING \*/i, '');
      const stmt = db.prepare(sqlWithoutReturning);
      stmt.run(...params);
      const tableName = sql.match(/UPDATE (\w+)/i)[1];
      const selectStmt = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`);
      return { rows: [selectStmt.get(id)] };
    } else {
      const stmt = db.prepare(sql);
      const result = stmt.run(...params);
      return { rows: [], rowCount: result.changes };
    }
  } catch (error) {
    console.error('Error en query:', error);
    throw error;
  }
}

module.exports = { db, query };
```

### 3.3. Crear script de inicialización de tablas

**Crear archivo:** `backend/init-sqlite.js`

```javascript
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
```

### 3.4. Actualizar modelos para usar SQLite

**Modificar:** `backend/config/database.js`

Reemplaza todo el contenido con:

```javascript
const fs = require('fs');
const path = require('path');

// Determinar si estamos en producción (Electron) o desarrollo
const isProduction = process.env.NODE_ENV === 'production' || process.env.ELECTRON_MODE === 'true';

if (isProduction) {
  // Usar SQLite en producción/Electron
  const sqliteDb = require('./database-sqlite');
  module.exports = sqliteDb;
} else {
  // Usar PostgreSQL en desarrollo
  const { Pool } = require('pg');
  
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'pos_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });

  pool.on('connect', () => {
    console.log('✓ Conectado a PostgreSQL');
  });

  pool.on('error', (err) => {
    console.error('Error en pool de PostgreSQL:', err);
  });

  module.exports = { pool, query: (text, params) => pool.query(text, params) };
}
```

---

## 📦 PASO 5: Instalar y Configurar Electron

### 4.1. Instalar Electron y herramientas de empaquetado

```powershell
# En la raíz del proyecto
npm install --save-dev electron electron-builder concurrently wait-on cross-env
```

### 4.2. Crear el archivo principal de Electron

**Crear archivo:** `electron-main.js` (en la raíz del proyecto)

```javascript
const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

// Establecer modo Electron
process.env.ELECTRON_MODE = 'true';
process.env.NODE_ENV = 'production';

let mainWindow;
let backendProcess;

function startBackend() {
  console.log('Iniciando servidor backend...');
  
  const backendPath = app.isPackaged
    ? path.join(process.resourcesPath, 'backend', 'server.js')
    : path.join(__dirname, 'backend', 'server.js');

  backendProcess = spawn('node', [backendPath], {
    env: { ...process.env, ELECTRON_MODE: 'true' },
    stdio: 'inherit'
  });

  backendProcess.on('error', (err) => {
    console.error('Error al iniciar backend:', err);
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
    },
    autoHideMenuBar: true,
    title: 'Mielissimo POS'
  });

  // Cargar la aplicación
  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }

  // Abrir DevTools en desarrollo
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startBackend();
  
  // Esperar a que el backend esté listo
  setTimeout(() => {
    createWindow();
  }, 3000);

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
  app.quit();
});

app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});
```

### 4.3. Actualizar package.json principal

**Crear archivo:** `package.json` (en la raíz del proyecto)

```json
{
  "name": "mielissimo-pos",
  "version": "1.0.0",
  "description": "Sistema POS para Mielissimo",
  "main": "electron-main.js",
  "scripts": {
    "start": "electron .",
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\" \"npm run dev:electron\"",
    "dev:backend": "cd backend && node server.js",
    "dev:frontend": "cd frontend && npm run dev",
    "dev:electron": "wait-on http://localhost:5173 && electron .",
    "build:frontend": "cd frontend && npm run build",
    "build": "npm run build:frontend && electron-builder",
    "build:win": "npm run build:frontend && electron-builder --win"
  },
  "build": {
    "appId": "com.mielissimo.pos",
    "productName": "Mielissimo POS",
    "directories": {
      "output": "dist-electron"
    },
    "files": [
      "electron-main.js",
      "backend/**/*",
      "frontend/dist/**/*",
      "node_modules/**/*"
    ],
    "win": {
      "target": "nsis",
      "icon": "assets/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    }
  },
  "devDependencies": {
    "electron": "^28.0.0",
    "electron-builder": "^24.9.0",
    "concurrently": "^8.2.2",
    "wait-on": "^7.2.0",
    "cross-env": "^7.0.3"
  }
}
```

---

## 🎨 PASO 6: Crear Icono para la Aplicación

1. Crea una carpeta `assets` en la raíz del proyecto
2. Coloca un icono en formato `.ico` (256x256 o 512x512 píxeles) llamado `icon.ico`
3. También copia el mismo icono como `icon.png`

**Puedes crear iconos gratis en:** [https://www.icoconverter.com/](https://www.icoconverter.com/)

---

## 🏗️ PASO 7: Inicializar la Base de Datos SQLite

```powershell
cd backend
node init-sqlite.js
```

Deberías ver:
```
✓ Base de datos SQLite conectada en: C:\Users\[TuUsuario]\AppData\Roaming\MielissimoPOS\mielissimo.db
✓ Tablas creadas exitosamente
✓ Productos de ejemplo insertados
```

---

## 🧪 PASO 8: Probar la Aplicación en Modo Desarrollo

### Opción A: Probar con Electron (Recomendado)

```powershell
# Desde la raíz del proyecto
npm run dev
```

Esto iniciará:
1. Backend en puerto 3000
2. Frontend en puerto 5173
3. Ventana de Electron

### Opción B: Probar sin Electron (navegador)

```powershell
# En una terminal
cd backend
node server.js

# En otra terminal
cd frontend
npm run dev
```

---

## 📦 PASO 9: Construir el Instalador

### 8.1. Compilar el frontend

```powershell
cd frontend
npm run build
cd ..
```

### 8.2. Crear el instalador

```powershell
npm run build:win
```

**⏱️ Tiempo estimado:** 10-20 minutos (primera vez)

El instalador se creará en: `dist-electron/`

Busca el archivo: `Mielissimo POS Setup 1.0.0.exe`

---

## 💿 PASO 10: Instalar en Otra Computadora

1. **Copia el archivo** `Mielissimo POS Setup 1.0.0.exe` a una USB
2. **En la otra computadora:**
   - Ejecuta el instalador
   - Sigue las instrucciones
   - La aplicación se instalará en `C:\Program Files\Mielissimo POS`
   - Aparecerá un icono en el escritorio

3. **Primera ejecución:**
   - Abre la aplicación
   - La base de datos se creará automáticamente
   - Empieza a usarla

---

## 📂 Ubicación de los Datos

La base de datos SQLite se guarda en:
```
C:\Users\[NombreUsuario]\AppData\Roaming\MielissimoPOS\mielissimo.db
```

### Para hacer backup:
1. Copia ese archivo `mielissimo.db`
2. Guárdalo en un lugar seguro
3. Para restaurar, reemplaza el archivo

---

## 🔧 Solución de Problemas

### Error: "la ejecución de scripts está deshabilitada" ⚠️ MÁS COMÚN
**Error completo:** `npm : No se puede cargar el archivo... porque la ejecución de scripts está deshabilitada en este sistema`

**Solución:**
1. Abre PowerShell como **Administrador**
2. Ejecuta: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
3. Presiona "S" para confirmar
4. Cierra PowerShell y ábrelo de nuevo (sin permisos de administrador)
5. Ahora `npm install` funcionará

**Explicación:** Windows bloquea la ejecución de scripts por seguridad. Este comando permite ejecutar scripts de npm.

### Error: "node no se reconoce como comando"
**Solución:** Instala Node.js desde [nodejs.org](https://nodejs.org)

### Error: "npm install falla"
**Solución:** 
```powershell
npm cache clean --force
npm install
```

### La aplicación no abre
**Solución:** 
1. Verifica que el puerto 3000 no esté ocupado
2. Revisa los logs en: `C:\Users\[TuUsuario]\AppData\Roaming\MielissimoPOS\logs`

### Error al construir el instalador
**Solución:**
```powershell
# Limpiar caché
npm run build:frontend
rmdir /s /q dist-electron
npm run build:win
```

---

## 📊 Comparación de Tamaños

- **Proyecto fuente:** ~50 MB
- **node_modules:** ~400 MB
- **Instalador final:** ~150-200 MB
- **Aplicación instalada:** ~300 MB

---

## ✅ Checklist Final

Antes de construir el instalador, verifica:

- [ ] Node.js instalado (v16+)
- [ ] Todas las dependencias instaladas (`npm install` en raíz, backend y frontend)
- [ ] Base de datos SQLite inicializada y funcionando
- [ ] Frontend compilado (`npm run build` en carpeta frontend)
- [ ] Icono creado en carpeta `assets/`
- [ ] Aplicación probada en modo desarrollo
- [ ] Sin errores en consola

---

## 🎯 Comandos Rápidos de Referencia

```powershell
# Iniciar en modo desarrollo
npm run dev

# Compilar frontend
cd frontend && npm run build && cd ..

# Crear instalador
npm run build:win

# Inicializar base de datos
cd backend && node init-sqlite.js && cd ..

# Limpiar todo y empezar de nuevo
rmdir /s /q node_modules
rmdir /s /q backend\node_modules
rmdir /s /q frontend\node_modules
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

---

## 📞 Próximos Pasos

Una vez que tengas el instalador:

1. **Distribución:** Puedes compartir el archivo .exe por USB, Google Drive, etc.
2. **Actualizaciones:** Crea nuevas versiones cambiando el número en `package.json`
3. **Personalización:** Cambia colores, logos e iconos según tu marca
4. **Backup automático:** Puedes agregar funcionalidad para exportar/importar la base de datos

---

¿Necesitas ayuda con algún paso específico? ¡Pregúntame!
