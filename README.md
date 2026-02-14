# 🏪 Sistema POS - Point of Sale

Sistema completo de punto de venta web con soporte para escaneo de códigos de barras y QR mediante lectores USB tipo HID.

## 📋 Características

### ✨ Funcionalidades Principales

- **Escaneo Universal de Códigos**
  - Compatible con cualquier lector USB tipo HID (actúa como teclado)
  - Soporte para códigos de barras (EAN-13, Code128, etc.)
  - Soporte para códigos QR
  - Búsqueda manual de productos

- **Gestión de Productos**
  - CRUD completo de productos
  - Códigos únicos por producto
  - Control de stock en tiempo real
  - Activación/desactivación de productos
  - Productos sin código (venta manual)

- **Sistema de Ventas**
  - Interfaz POS intuitiva y rápida
  - Carrito de compras con actualización en tiempo real
  - Validación de stock automática
  - Múltiples métodos de pago
  - Registro completo de transacciones

- **Historial y Reportes**
  - Historial completo de ventas
  - Ventas del día
  - Estadísticas generales
  - Detalle completo de cada venta
  - Productos más vendidos

## 🛠 Stack Tecnológico

### Backend
- **Runtime**: Node.js v18+
- **Framework**: Express.js
- **Base de Datos**: PostgreSQL
- **Validación**: express-validator
- **CORS**: Habilitado para desarrollo local

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Estilos**: CSS puro con variables CSS

## 📁 Estructura del Proyecto

```
pos-system/
├── backend/
│   ├── config/
│   │   └── database.js          # Configuración de PostgreSQL
│   ├── controllers/
│   │   ├── ProductoController.js
│   │   └── VentaController.js
│   ├── models/
│   │   ├── ProductoModel.js
│   │   └── VentaModel.js
│   ├── routes/
│   │   ├── productos.js
│   │   └── ventas.js
│   ├── middleware/
│   │   └── validation.js
│   ├── migrations/
│   │   ├── 001_initial.js
│   │   └── run.js
│   ├── server.js
│   ├── package.json
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Navbar.jsx
    │   │   └── Navbar.css
    │   ├── pages/
    │   │   ├── POS.jsx              # Pantalla principal de ventas
    │   │   ├── POS.css
    │   │   ├── Productos.jsx        # Gestión de productos
    │   │   ├── Productos.css
    │   │   ├── Ventas.jsx          # Historial y estadísticas
    │   │   └── Ventas.css
    │   ├── services/
    │   │   └── api.js              # Cliente API
    │   ├── styles/
    │   │   └── global.css          # Estilos globales
    │   ├── App.jsx
    │   └── main.jsx
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── .env.example
```

## 🚀 Instalación y Configuración

### Requisitos Previos

- Node.js v18 o superior
- PostgreSQL 13 o superior
- npm o yarn

### 1. Clonar el Repositorio

```bash
git clone <repository-url>
cd pos-system
```

### 2. Configurar Backend

```bash
cd backend

# Instalar dependencias
npm install

# Crear archivo de configuración
cp .env.example .env

# Editar .env con tus credenciales de PostgreSQL
nano .env
```

Configurar las variables de entorno en `.env`:

```env
DATABASE_URL=postgresql://usuario:password@localhost:5432/pos_db
PORT=3000
NODE_ENV=development
```

### 3. Crear Base de Datos

```bash
# Conectarse a PostgreSQL
psql -U postgres

# Crear base de datos
CREATE DATABASE pos_db;

# Salir
\q
```

### 4. Ejecutar Migraciones

```bash
npm run migrate
```

Esto creará las tablas necesarias y agregará productos de ejemplo.

### 5. Iniciar Backend

```bash
# Modo desarrollo
npm run dev

# Modo producción
npm start
```

El servidor estará disponible en `http://localhost:3000`

### 6. Configurar Frontend

```bash
cd ../frontend

# Instalar dependencias
npm install

# Crear archivo de configuración
cp .env.example .env

# Editar .env si es necesario
nano .env
```

Configurar la URL de la API en `.env`:

```env
VITE_API_URL=http://localhost:3000/api
```

### 7. Iniciar Frontend

```bash
# Modo desarrollo
npm run dev

# Build para producción
npm run build
```

La aplicación estará disponible en `http://localhost:5173`

## 📖 Uso del Sistema

### Escaneo de Productos

1. **Con Lector USB HID**:
   - Conecte su lector de códigos de barras/QR por USB
   - El lector debe configurarse para actuar como teclado
   - Enfoque el campo de búsqueda en la pantalla POS
   - Escanee el código - se agregará automáticamente al carrito

2. **Entrada Manual**:
   - Escriba el código en el campo de búsqueda
   - Presione Enter o clic en "Buscar"

### Gestión de Productos

1. Ir a la sección **"Productos"**
2. Clic en **"+ Nuevo Producto"**
3. Completar los datos:
   - Nombre (requerido)
   - Código (opcional - para escaneo)
   - Precio (requerido)
   - Stock (requerido)
4. Guardar

**Nota**: Los productos sin código pueden venderse mediante búsqueda manual por nombre.

### Realizar una Venta

1. En la pantalla principal (POS):
2. Escanear o buscar productos
3. Ajustar cantidades si es necesario
4. Revisar el total
5. Clic en **"Procesar Venta"**
6. Confirmar la transacción

### Ver Historial

1. Ir a **"Historial"**
2. Seleccionar:
   - **Todas las Ventas**: Historial completo
   - **Ventas de Hoy**: Solo transacciones del día
   - **Estadísticas**: Métricas generales
3. Clic en **"Ver Detalle"** para ver información completa de una venta

## 🔌 API Endpoints

### Productos

```
GET    /api/productos              - Listar todos los productos
GET    /api/productos/:id          - Obtener producto por ID
GET    /api/productos/codigo/:codigo - Buscar por código (escaneo)
GET    /api/productos/search?q=    - Buscar productos
POST   /api/productos              - Crear producto
PUT    /api/productos/:id          - Actualizar producto
DELETE /api/productos/:id          - Desactivar producto
```

### Ventas

```
GET    /api/ventas                 - Listar ventas
GET    /api/ventas/:id             - Obtener venta por ID
GET    /api/ventas/today           - Ventas de hoy
GET    /api/ventas/stats           - Estadísticas generales
GET    /api/ventas/top-products    - Productos más vendidos
POST   /api/ventas                 - Registrar venta
```

## 🗄 Esquema de Base de Datos

### Tabla: productos

| Campo      | Tipo         | Descripción                    |
|------------|--------------|--------------------------------|
| id         | SERIAL       | ID único (PK)                  |
| nombre     | VARCHAR(255) | Nombre del producto            |
| codigo     | VARCHAR(255) | Código único (barras/QR)       |
| precio     | DECIMAL      | Precio unitario                |
| stock      | INTEGER      | Cantidad disponible            |
| activo     | BOOLEAN      | Estado del producto            |
| created_at | TIMESTAMP    | Fecha de creación              |
| updated_at | TIMESTAMP    | Última actualización           |

### Tabla: ventas

| Campo        | Tipo      | Descripción              |
|--------------|-----------|--------------------------|
| id           | SERIAL    | ID único (PK)            |
| total        | DECIMAL   | Total de la venta        |
| items_count  | INTEGER   | Cantidad de productos    |
| metodo_pago  | VARCHAR   | Método de pago           |
| created_at   | TIMESTAMP | Fecha de la venta        |

### Tabla: venta_items

| Campo            | Tipo         | Descripción                |
|------------------|--------------|----------------------------|
| id               | SERIAL       | ID único (PK)              |
| venta_id         | INTEGER      | Referencia a venta (FK)    |
| producto_id      | INTEGER      | Referencia a producto (FK) |
| producto_nombre  | VARCHAR(255) | Nombre del producto        |
| producto_codigo  | VARCHAR(255) | Código del producto        |
| cantidad         | INTEGER      | Cantidad vendida           |
| precio_unitario  | DECIMAL      | Precio al momento de venta |
| subtotal         | DECIMAL      | Total del item             |
| created_at       | TIMESTAMP    | Fecha de registro          |

## 🚀 Deploy en Railway

### Backend

1. Crear cuenta en [Railway](https://railway.app)
2. Crear nuevo proyecto
3. Agregar PostgreSQL desde el catálogo
4. Agregar servicio desde GitHub/Local
5. Configurar variables de entorno:
   ```
   DATABASE_URL=${DATABASE_URL}
   PORT=3000
   NODE_ENV=production
   ```
6. Deploy automático

### Frontend

1. En Railway, agregar otro servicio
2. Configurar build command:
   ```
   npm run build
   ```
3. Configurar start command:
   ```
   npx serve -s dist -l $PORT
   ```
4. Configurar variable de entorno:
   ```
   VITE_API_URL=https://tu-backend.railway.app/api
   ```

## 🔧 Configuración de Lectores

### Lectores USB HID (Recomendado)

Los lectores USB tipo HID que actúan como teclado son los más compatibles. No requieren drivers adicionales.

**Configuración sugerida**:
- Modo: Teclado (HID)
- Sufijo: Enter (CR/LF)
- Prefijo: Ninguno
- Auto-submit: Habilitado

**Marcas probadas**:
- Symbol/Zebra DS series
- Honeywell Voyager
- Datalogic QuickScan
- Lectores genéricos USB

## 🐛 Solución de Problemas

### El lector no funciona

1. Verificar que el lector está en modo HID/Teclado
2. Probar en un editor de texto - debe escribir el código
3. Asegurar que el campo de entrada tiene el foco
4. Verificar que el sufijo está configurado como "Enter"

### Error de conexión a la base de datos

1. Verificar que PostgreSQL está ejecutándose
2. Revisar las credenciales en `.env`
3. Confirmar que la base de datos existe
4. Ejecutar las migraciones: `npm run migrate`

### Productos no se encuentran al escanear

1. Verificar que el código en la BD coincide exactamente
2. Los códigos son case-sensitive
3. Revisar que el producto está activo
4. Probar búsqueda manual primero

### Error de stock insuficiente

1. Verificar stock disponible en la gestión de productos
2. El sistema previene ventas sin stock
3. Actualizar el stock del producto

## 🌐 Despliegue en Producción

Este sistema puede desplegarse fácilmente en la nube usando servicios gratuitos:

### Opción Recomendada: Vercel + Supabase

- **Frontend**: Vercel (gratis)
- **Backend**: Vercel (gratis)
- **Base de Datos**: Supabase Free Tier (gratis)

**Guías de despliegue:**
- 📖 [Guía Completa de Despliegue](GUIA_DESPLIEGUE_VERCEL_SUPABASE.md) - Paso a paso detallado
- ⚡ [Resumen Rápido](RESUMEN_DESPLIEGUE.md) - 5 pasos en 15 minutos
- 🗄️ [Script SQL para Supabase](supabase_setup.sql) - Crear tablas rápidamente

**Tiempo estimado**: 15-20 minutos  
**Costo**: $0 (100% gratis con límites generosos)

### Otras opciones

- **Railway**: Backend + PostgreSQL
- **Render**: Backend + PostgreSQL
- **Netlify**: Frontend
- **PlanetScale**: Base de datos MySQL

## 📝 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📧 Soporte

Para problemas o preguntas, por favor abrir un issue en el repositorio.

---

Desarrollado con ❤️ para comercios reales
