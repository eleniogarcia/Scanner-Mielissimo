# 🚀 Guía de Deployment en Railway

Esta guía te ayudará a desplegar el Sistema POS completo en Railway.

## 📋 Requisitos Previos

- Cuenta en [Railway](https://railway.app)
- Cuenta de GitHub (opcional pero recomendado)
- Código del proyecto listo

## 🗄 Paso 1: Deploy de la Base de Datos

1. **Crear nuevo proyecto en Railway**
   - Ir a [railway.app](https://railway.app)
   - Click en "New Project"
   - Seleccionar "Provision PostgreSQL"

2. **Obtener credenciales**
   - Click en el servicio PostgreSQL
   - Ir a "Connect"
   - Copiar la variable `DATABASE_URL`

## 🔧 Paso 2: Deploy del Backend

### Opción A: Desde GitHub (Recomendado)

1. **Subir código a GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/tu-usuario/pos-system.git
   git push -u origin main
   ```

2. **Conectar Railway con GitHub**
   - En el mismo proyecto de Railway
   - Click en "New"
   - Seleccionar "GitHub Repo"
   - Autorizar Railway en GitHub
   - Seleccionar tu repositorio

3. **Configurar el servicio**
   - Railway detectará automáticamente Node.js
   - Ir a "Settings" del servicio
   - En "Root Directory" poner: `backend`

4. **Configurar variables de entorno**
   - Ir a "Variables"
   - Agregar las siguientes variables:
   ```
   DATABASE_URL = ${PostgreSQL.DATABASE_URL}
   NODE_ENV = production
   PORT = ${{RAILWAY_PUBLIC_PORT}}
   ```

5. **Ejecutar migraciones**
   - Ir a "Settings"
   - En "Deploy" scroll hasta "Custom Start Command"
   - Temporalmente poner: `npm run migrate && npm start`
   - Deploy
   - Una vez que termine, cambiar a solo: `npm start`
   - Deploy nuevamente

### Opción B: Desde CLI de Railway

1. **Instalar Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login**
   ```bash
   railway login
   ```

3. **Iniciar proyecto**
   ```bash
   cd backend
   railway init
   ```

4. **Vincular con proyecto existente**
   ```bash
   railway link
   ```

5. **Configurar variables**
   ```bash
   railway variables set NODE_ENV=production
   railway variables set DATABASE_URL=<tu_database_url>
   ```

6. **Deploy**
   ```bash
   railway up
   ```

## 🎨 Paso 3: Deploy del Frontend

1. **Agregar nuevo servicio**
   - En el mismo proyecto de Railway
   - Click en "New"
   - Seleccionar "GitHub Repo" (o usar CLI)
   - Seleccionar tu repositorio

2. **Configurar el servicio**
   - Ir a "Settings"
   - En "Root Directory" poner: `frontend`

3. **Configurar Build y Start Commands**
   - Ir a "Settings" > "Deploy"
   - Build Command: `npm install && npm run build`
   - Start Command: `npx serve -s dist -l $PORT`

4. **Configurar variables de entorno**
   - Ir a "Variables"
   - Agregar:
   ```
   VITE_API_URL = https://tu-backend.railway.app/api
   ```
   (Reemplaza con la URL real de tu backend)

5. **Deploy**
   - Click en "Deploy"

## 🌐 Paso 4: Generar Dominios Públicos

### Backend
1. Ir al servicio del Backend
2. Click en "Settings" > "Networking"
3. Click en "Generate Domain"
4. Copiar la URL generada (ej: `https://tu-backend.railway.app`)

### Frontend
1. Ir al servicio del Frontend
2. Click en "Settings" > "Networking"
3. Click en "Generate Domain"
4. Esta será tu URL pública (ej: `https://tu-frontend.railway.app`)

### Actualizar URL del Backend en Frontend
1. Ir al servicio del Frontend
2. "Variables" > `VITE_API_URL`
3. Actualizar con la URL real del backend
4. Redeploy

## ✅ Paso 5: Verificación

1. **Verificar Backend**
   - Visitar: `https://tu-backend.railway.app/health`
   - Debe retornar: `{"status":"ok",...}`

2. **Verificar Frontend**
   - Visitar: `https://tu-frontend.railway.app`
   - Debe cargar la aplicación

3. **Probar funcionalidad**
   - Crear un producto
   - Realizar una venta de prueba
   - Verificar historial

## 🔒 Paso 6: Configuración Adicional (Opcional)

### Agregar Dominio Personalizado

1. En Railway, ir al servicio del Frontend
2. "Settings" > "Domains"
3. Click en "Custom Domain"
4. Ingresar tu dominio
5. Configurar DNS según instrucciones

### Habilitar Logs

- Los logs están disponibles en cada servicio
- Click en "Deployments" para ver logs de deploy
- Click en "Observability" para ver logs en tiempo real

### Configurar Auto-Deploy

- Por defecto habilitado desde GitHub
- Cada push a `main` desplegará automáticamente
- Configurar en "Settings" > "Deploy Triggers"

## 🐛 Troubleshooting

### Backend no conecta a la base de datos
- Verificar que `DATABASE_URL` está configurada correctamente
- Usar la variable de referencia: `${PostgreSQL.DATABASE_URL}`
- Verificar logs para errores de conexión

### Frontend no se conecta al Backend
- Verificar que `VITE_API_URL` tiene la URL correcta
- Incluir `/api` al final
- Verificar CORS en el backend

### Error en migraciones
- Ejecutar migraciones manualmente:
  ```bash
  railway run npm run migrate
  ```
- O mediante el dashboard añadiendo el comando temporalmente

### Aplicación lenta
- Railway ofrece recursos limitados en plan gratuito
- Considerar upgrade para mejor performance
- Optimizar queries de base de datos

## 💰 Costos

### Plan Hobby (Gratuito)
- 500 horas de uso/mes
- $5 de uso gratuito
- Suficiente para desarrollo y pruebas

### Plan Pro
- Desde $20/mes
- Recursos garantizados
- Mejor para producción

## 📊 Monitoreo

- Railway Dashboard muestra:
  - CPU usage
  - Memory usage
  - Request count
  - Response times

## 🔄 Actualizar la Aplicación

### Desde GitHub
1. Push cambios a GitHub
2. Railway detectará y desplegará automáticamente

### Desde Railway CLI
```bash
railway up
```

## 📱 Variables de Entorno Completas

### Backend
```env
DATABASE_URL=${PostgreSQL.DATABASE_URL}
NODE_ENV=production
PORT=${{RAILWAY_PUBLIC_PORT}}
```

### Frontend
```env
VITE_API_URL=https://tu-backend.railway.app/api
```

## 🎯 Checklist Final

- [ ] PostgreSQL desplegado
- [ ] Backend desplegado
- [ ] Frontend desplegado
- [ ] Variables de entorno configuradas
- [ ] Migraciones ejecutadas
- [ ] Dominios generados
- [ ] VITE_API_URL actualizada en frontend
- [ ] Health check del backend funciona
- [ ] Frontend carga correctamente
- [ ] Crear producto de prueba funciona
- [ ] Venta de prueba funciona

## 📞 Soporte

- [Documentación de Railway](https://docs.railway.app)
- [Discord de Railway](https://discord.gg/railway)
- [Status de Railway](https://status.railway.app)

---

¡Listo! Tu sistema POS ahora está en producción 🎉
