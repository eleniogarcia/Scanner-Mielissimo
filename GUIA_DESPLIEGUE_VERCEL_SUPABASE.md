# Guía de Despliegue en Vercel y Supabase

Esta guía te ayudará a desplegar tu sistema POS completo usando:
- **Supabase** (Base de datos PostgreSQL gratuita)
- **Vercel** (Backend y Frontend)

---

## 📋 Requisitos Previos

1. Una cuenta de GitHub
2. Una cuenta en [Supabase](https://supabase.com) (gratis)
3. Una cuenta en [Vercel](https://vercel.com) (gratis)
4. Git instalado en tu computadora

---

## 🗄️ PASO 1: Configurar Base de Datos en Supabase

### 1.1 Crear un Proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com) y crea una cuenta
2. Click en **"New Project"**
3. Configura:
   - **Name**: `pos-system` (o el nombre que prefieras)
   - **Database Password**: Crea una contraseña segura (¡GUÁRDALA!)
   - **Region**: Selecciona la más cercana a ti
   - **Pricing Plan**: Free
4. Click en **"Create new project"** (tomará 1-2 minutos)

### 1.2 Obtener la URL de Conexión

1. En tu proyecto de Supabase, ve a **Settings** → **Database**
2. Busca la sección **"Connection string"**
3. Selecciona **"URI"** (o "Connection pooling")
4. Copia la URL que se ve así:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.abcdefghijk.supabase.co:5432/postgres
   ```
5. Reemplaza `[YOUR-PASSWORD]` con la contraseña que creaste
6. **Guarda esta URL**, la necesitarás después

### 1.3 Crear las Tablas

1. En Supabase, ve a **SQL Editor**
2. Click en **"New query"**
3. Copia y pega el siguiente SQL:

\`\`\`sql
-- Crear tabla de productos
CREATE TABLE IF NOT EXISTS productos (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(255) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    precio DECIMAL(10,2) NOT NULL CHECK (precio >= 0),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Crear tabla de ventas
CREATE TABLE IF NOT EXISTS ventas (
    id SERIAL PRIMARY KEY,
    total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
    items JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_productos_codigo ON productos(codigo);
CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos(activo);
CREATE INDEX IF NOT EXISTS idx_productos_nombre ON productos(nombre);
CREATE INDEX IF NOT EXISTS idx_ventas_created_at ON ventas(created_at);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para productos
DROP TRIGGER IF EXISTS update_productos_updated_at ON productos;
CREATE TRIGGER update_productos_updated_at
    BEFORE UPDATE ON productos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
\`\`\`

4. Click en **"Run"** o presiona `Ctrl + Enter`
5. Deberías ver un mensaje de éxito

### 1.4 (Opcional) Agregar Productos de Prueba

Ejecuta esto en el SQL Editor para tener datos de prueba:

\`\`\`sql
INSERT INTO productos (codigo, nombre, precio, activo) VALUES
('7501000111111', 'Coca-Cola 600ml', 15.00, true),
('7501000222222', 'Sabritas Original', 18.50, true),
('7501000333333', 'Agua Ciel 1L', 12.00, true),
('7501000444444', 'Chocoroles', 25.00, true),
('7501000555555', 'Gansito', 14.50, true);
\`\`\`

---

## 🚀 PASO 2: Preparar Repositorio en GitHub

### 2.1 Crear Repositorio

1. Ve a [https://github.com/new](https://github.com/new)
2. Nombra tu repositorio: `pos-system`
3. Deja todo por defecto (público o privado, tú decides)
4. Click en **"Create repository"**

### 2.2 Subir tu Código

Abre tu terminal en la carpeta del proyecto (`C:\Users\test\Desktop\pos-system`) y ejecuta:

\`\`\`bash
# Inicializar git (si no lo has hecho)
git init

# Agregar todos los archivos
git add .

# Hacer commit
git commit -m "Initial commit - POS System"

# Agregar el repositorio remoto (reemplaza TU-USUARIO)
git remote add origin https://github.com/TU-USUARIO/pos-system.git

# Subir el código
git push -u origin main
\`\`\`

**Nota**: Si te pide credenciales, usa tu usuario de GitHub y un Personal Access Token (no tu contraseña).

---

## 🔧 PASO 3: Desplegar Backend en Vercel

### 3.1 Importar Proyecto

1. Ve a [https://vercel.com](https://vercel.com) e inicia sesión
2. Click en **"Add New"** → **"Project"**
3. Importa tu repositorio de GitHub `pos-system`
4. Vercel detectará que tienes múltiples carpetas

### 3.2 Configurar Backend

1. En **"Configure Project"**:
   - **Project Name**: `pos-backend` (o lo que prefieras)
   - **Framework Preset**: Other
   - **Root Directory**: `backend` ← **MUY IMPORTANTE**
   - **Build Command**: `npm install` (déjalo vacío o usa este)
   - **Output Directory**: Déjalo vacío
   - **Install Command**: `npm install`

2. Click en **"Environment Variables"**

3. Agrega estas variables:
   - **Key**: `DATABASE_URL`
     - **Value**: Pega la URL de Supabase que copiaste antes
   - **Key**: `NODE_ENV`
     - **Value**: `production`

4. Click en **"Deploy"**

5. Espera 1-2 minutos. Una vez completado, copia la URL del backend:
   ```
   https://pos-backend-xxx.vercel.app
   ```

### 3.3 Verificar que Funciona

Abre en tu navegador:
```
https://pos-backend-xxx.vercel.app/health
```

Deberías ver algo como:
```json
{
  "status": "ok",
  "timestamp": "2026-02-14T...",
  "environment": "production"
}
```

---

## 🎨 PASO 4: Desplegar Frontend en Vercel

### 4.1 Importar Proyecto (Nuevamente)

1. En Vercel, click en **"Add New"** → **"Project"**
2. Selecciona nuevamente tu repositorio `pos-system`

### 4.2 Configurar Frontend

1. En **"Configure Project"**:
   - **Project Name**: `pos-frontend` (o lo que prefieras)
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend` ← **MUY IMPORTANTE**
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

2. Click en **"Environment Variables"**

3. Agrega esta variable:
   - **Key**: `VITE_API_URL`
     - **Value**: `https://pos-backend-xxx.vercel.app/api` (usa tu URL del backend)

4. Click en **"Deploy"**

5. Espera 1-2 minutos. Una vez completado, copia la URL del frontend:
   ```
   https://pos-frontend-xxx.vercel.app
   ```

### 4.3 Probar la Aplicación

1. Abre la URL de tu frontend: `https://pos-frontend-xxx.vercel.app`
2. Deberías ver tu sistema POS funcionando
3. Prueba:
   - Ver productos
   - Agregar productos
   - Hacer una venta
   - Ver el historial de ventas

---

## 🔄 PASO 5: Configurar CORS (Si hay problemas)

Si ves errores de CORS en la consola del navegador, agrega esta variable en el **backend** en Vercel:

1. Ve a tu proyecto del backend en Vercel
2. **Settings** → **Environment Variables**
3. Agrega:
   - **Key**: `CORS_ORIGIN`
   - **Value**: `https://pos-frontend-xxx.vercel.app` (tu URL del frontend)

4. Luego actualiza el archivo `backend/server.js` localmente:

\`\`\`javascript
// Reemplaza la línea app.use(cors());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
\`\`\`

5. Haz commit y push:
\`\`\`bash
git add .
git commit -m "Configurar CORS para producción"
git push
\`\`\`

Vercel volverá a desplegar automáticamente.

---

## 🎯 URLs Finales

Una vez completado, tendrás:

- **Frontend**: `https://pos-frontend-xxx.vercel.app`
- **Backend**: `https://pos-backend-xxx.vercel.app`
- **Base de Datos**: Supabase (administra desde su dashboard)

---

## 📱 Configuración Adicional

### Dominio Personalizado (Opcional)

Si tienes un dominio propio:
1. En Vercel, ve a tu proyecto → **Settings** → **Domains**
2. Agrega tu dominio personalizado
3. Sigue las instrucciones para configurar el DNS

### Actualizar la Aplicación

Para hacer cambios:
1. Modifica tu código localmente
2. Haz commit y push:
   \`\`\`bash
   git add .
   git commit -m "Descripción del cambio"
   git push
   \`\`\`
3. Vercel desplegará automáticamente los cambios en ambos proyectos

---

## 🐛 Solución de Problemas

### El backend no conecta a la base de datos
- Verifica que la variable `DATABASE_URL` esté correcta en Vercel
- Asegúrate de haber reemplazado `[YOUR-PASSWORD]` con tu contraseña real
- En Supabase, verifica que las tablas existan (ve a **Table Editor**)

### Error 404 en el frontend
- Verifica que el `vercel.json` exista en la carpeta `frontend`
- Verifica que la variable `VITE_API_URL` esté configurada correctamente

### El frontend no conecta al backend
- Abre las DevTools del navegador (F12)
- Ve a la consola y verifica el error
- Asegúrate de que `VITE_API_URL` termine en `/api`
- Verifica que el backend esté funcionando visitando `/health`

### Las migraciones no funcionan
- En Supabase, ejecuta manualmente el SQL de las tablas desde el SQL Editor
- Vercel no ejecuta migraciones automáticamente, debes crear las tablas primero

---

## 💾 Backup de la Base de Datos

Supabase hace backups automáticos, pero puedes crear uno manual:

1. En Supabase, ve a **Database** → **Backups**
2. Los backups automáticos se guardan diariamente (Free Tier: 7 días)
3. Para exportar manualmente:
   - Ve a **SQL Editor**
   - Ejecuta: `pg_dump` desde la terminal de Supabase

---

## 💰 Costos (Free Tier)

Todos estos servicios son **GRATIS** con límites generosos:

- **Supabase**: 
  - 500MB de base de datos
  - 2GB de almacenamiento
  - 5GB de transferencia/mes
  
- **Vercel**: 
  - 100GB de ancho de banda/mes
  - Despliegues ilimitados
  - Funciones serverless hasta 100GB-Hrs

Para un POS pequeño/mediano, estos límites son más que suficientes.

---

## ✅ Checklist Final

- [ ] Proyecto creado en Supabase
- [ ] Tablas creadas en Supabase
- [ ] URL de base de datos copiada
- [ ] Código subido a GitHub
- [ ] Backend desplegado en Vercel
- [ ] Variable `DATABASE_URL` configurada en backend
- [ ] Backend funcionando (verificar `/health`)
- [ ] Frontend desplegado en Vercel
- [ ] Variable `VITE_API_URL` configurada en frontend
- [ ] Aplicación funcionando completamente
- [ ] Productos de prueba agregados

---

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs en Vercel (**Deployments** → click en el deployment → **Function Logs**)
2. Revisa los logs en Supabase (**Logs** → **Postgres Logs**)
3. Verifica las variables de entorno en Vercel

¡Listo! Tu sistema POS ahora está en la nube 🎉
