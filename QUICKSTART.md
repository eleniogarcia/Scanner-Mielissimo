# ⚡ Guía de Inicio Rápido

## 🚀 Instalación en 5 minutos

### Requisitos
- Node.js 18+ ([Descargar](https://nodejs.org))
- PostgreSQL 13+ ([Descargar](https://www.postgresql.org/download/))

### Instalación Automática

```bash
# 1. Navegar al directorio del proyecto
cd pos-system

# 2. Ejecutar script de instalación (Linux/Mac)
chmod +x install.sh
./install.sh

# Windows: seguir pasos manuales abajo
```

### Instalación Manual

#### Backend

```bash
cd backend

# Instalar dependencias
npm install

# Configurar base de datos
cp .env.example .env
# Editar .env con tus credenciales de PostgreSQL

# Crear base de datos
psql -U postgres
CREATE DATABASE pos_db;
\q

# Ejecutar migraciones
npm run migrate

# Iniciar servidor
npm run dev
```

#### Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Configurar API
cp .env.example .env
# Verificar que VITE_API_URL apunte a http://localhost:3000/api

# Iniciar aplicación
npm run dev
```

## 🎯 Acceder al Sistema

1. **Backend API**: http://localhost:3000
2. **Frontend Web**: http://localhost:5173

## 📝 Primer Uso

### 1. Productos de Ejemplo
El sistema incluye 5 productos de ejemplo:
- Coca Cola 500ml (código: 7501234567890)
- Pan Integral (código: 7501234567891)
- Leche Lala 1L (código: 7501234567892)
- Agua Bonafont 1.5L (código: 7501234567893)
- Galletas Marías (código: 7501234567894)

### 2. Realizar Primera Venta

1. Ve a la pantalla principal (POS)
2. En el campo de búsqueda, ingresa: `7501234567890`
3. Presiona Enter
4. El producto se agregará al carrito
5. Click en "Procesar Venta"

### 3. Agregar Nuevo Producto

1. Ve a "Productos"
2. Click en "+ Nuevo Producto"
3. Completa los datos:
   - Nombre: Refresco X
   - Código: 123456 (o deja vacío)
   - Precio: 20.00
   - Stock: 50
4. Click en "Crear"

### 4. Probar con Lector

Si tienes un lector de códigos USB:

1. Conecta el lector
2. Configúralo en modo HID/Teclado
3. Ve a la pantalla POS
4. Click en el campo de búsqueda
5. Escanea un código
6. El producto se agregará automáticamente

## 🔧 Configuración de Lectores USB

### Configuración Recomendada
- **Modo**: HID (Teclado)
- **Sufijo**: Enter (CR o LF)
- **Prefijo**: Ninguno
- **Auto-submit**: Habilitado

### Lectores Compatibles
- Lectores USB genéricos
- Symbol/Zebra DS series
- Honeywell Voyager
- Datalogic QuickScan
- Cualquier lector HID

## 📚 Próximos Pasos

1. Lee el [README.md](README.md) completo
2. Consulta la [documentación de la API](API.md)
3. Revisa la [guía de deployment](DEPLOYMENT.md)

## ❓ Problemas Comunes

### El backend no inicia
- Verifica que PostgreSQL está corriendo
- Revisa las credenciales en `.env`
- Ejecuta `npm run migrate`

### El frontend no se conecta
- Verifica que el backend está corriendo
- Revisa `VITE_API_URL` en `.env`
- Abre las herramientas de desarrollador (F12) y revisa la consola

### El lector no funciona
- Verifica que el lector está en modo HID
- Prueba escribir en un editor de texto
- Asegúrate que el campo tiene el foco
- Verifica que el sufijo es "Enter"

## 💡 Tips

- Usa la tecla Tab para navegar rápidamente
- El campo de búsqueda siempre tiene foco automático
- Presiona Enter después de escanear para agregar rápido
- Usa Ctrl+C en las terminales para detener los servidores

## 🎓 Recursos de Aprendizaje

- [Documentación de Express](https://expressjs.com/)
- [Documentación de React](https://react.dev/)
- [Documentación de PostgreSQL](https://www.postgresql.org/docs/)

---

¿Listo para empezar? ¡Ejecuta `./install.sh` y comienza a vender! 🚀
