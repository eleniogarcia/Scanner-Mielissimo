# 🚀 Guía Rápida - Aplicación de Escritorio

## Para seguir todos los pasos detallados, lee: [GUIA_APLICACION_ESCRITORIO.md](GUIA_APLICACION_ESCRITORIO.md)

---

## ⚡ Inicio Rápido (En otra computadora)

### 1. Requisitos
- Node.js 16+ instalado
- Windows 10/11

### 2. Copiar proyecto
Copia toda la carpeta `ScannerMielissimo` a la nueva computadora

### 3. Instalar dependencias
```powershell
# En la raíz del proyecto
npm install

# En backend
cd backend
npm install
npm install sqlite3 better-sqlite3

# En frontend
cd ..\frontend
npm install
cd ..
```

### 4. Inicializar base de datos SQLite
```powershell
cd backend
node init-sqlite.js
cd ..
```

### 5. Instalar Electron
```powershell
npm install --save-dev electron electron-builder concurrently wait-on cross-env
```

### 6. Crear el instalador
```powershell
# Compilar frontend
cd frontend
npm run build
cd ..

# Crear instalador
npm run build:win
```

El instalador estará en: `dist-electron/Mielissimo POS Setup 1.0.0.exe`

---

## 🧪 Probar antes de construir

```powershell
# Backend (una terminal)
cd backend
set ELECTRON_MODE=true
node server.js

# Frontend (otra terminal)
cd frontend
npm run dev
```

Abre http://localhost:5173

---

## 📋 Archivos creados

✅ `backend/config/database-sqlite.js` - Configuración SQLite
✅ `backend/init-sqlite.js` - Script inicialización
✅ `electron-main.js` - Archivo principal Electron
✅ `package.json` - Configuración raíz con Electron
✅ `GUIA_APLICACION_ESCRITORIO.md` - Guía completa detallada

---

## ⚠️ Importante

1. La base de datos se guarda en: `C:\Users\[Usuario]\AppData\Roaming\MielissimoPOS\mielissimo.db`
2. Para hacer backup, copia ese archivo
3. El instalador pesa ~150-200 MB
4. Primera construcción tarda 10-20 minutos

---

## 🆘 Si algo falla

```powershell
# Limpiar todo
rmdir /s /q node_modules
rmdir /s /q backend\node_modules  
rmdir /s /q frontend\node_modules
rmdir /s /q dist-electron

# Reinstalar
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Intentar de nuevo
npm run build:win
```

---

## 📞 Siguiente paso

Lee la [GUIA_APLICACION_ESCRITORIO.md](GUIA_APLICACION_ESCRITORIO.md) para instrucciones completas paso a paso.
