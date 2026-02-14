# ✅ Checklist Pre-Despliegue

Verifica estos puntos antes de desplegar a producción.

---

## 📋 Preparación Local

- [ ] El backend funciona localmente en `http://localhost:3000`
- [ ] El frontend funciona localmente en `http://localhost:5173`
- [ ] Puedes crear, editar y eliminar productos
- [ ] Puedes realizar ventas correctamente
- [ ] El historial de ventas muestra datos
- [ ] No hay errores en la consola del navegador (F12)
- [ ] No hay errores en la terminal del backend

---

## 🗄️ Base de Datos

- [ ] Tienes el script SQL listo (`supabase_setup.sql`)
- [ ] Conoces la estructura de tus tablas
- [ ] Tienes un backup de tus datos locales (si migras datos)
- [ ] Has probado el sistema con datos reales

---

## 📦 Repositorio

- [ ] `.gitignore` está configurado correctamente
- [ ] Archivos `.env` NO están en el repositorio
- [ ] Archivos `.env.example` SÍ están en el repositorio
- [ ] El código está en una rama `main` o `master`
- [ ] Has hecho commit de todos los cambios
- [ ] Has creado un repositorio en GitHub

---

## 🔧 Configuración de Archivos

### Backend
- [ ] `backend/vercel.json` existe
- [ ] `backend/.env.example` documentado
- [ ] `backend/package.json` tiene el script `"start"`
- [ ] `backend/server.js` tiene el puerto configurado con `process.env.PORT`

### Frontend
- [ ] `frontend/vercel.json` existe
- [ ] `frontend/.env.example` documentado
- [ ] `frontend/vite.config.js` usa `VITE_API_URL`
- [ ] `frontend/src/services/api.js` usa `import.meta.env.VITE_API_URL`

---

## 🔐 Variables de Entorno

### Para Supabase
- [ ] Has creado un proyecto en Supabase
- [ ] Tienes la contraseña de la base de datos guardada
- [ ] Has copiado la URL de conexión (Connection String)
- [ ] Has ejecutado el script SQL en Supabase

### Para Vercel Backend
- [ ] `DATABASE_URL` - URL de Supabase lista
- [ ] `NODE_ENV` - Será `production`

### Para Vercel Frontend
- [ ] La URL del backend desplegado (la obtendrás después del primer deploy)

---

## 🌐 Cuentas y Accesos

- [ ] Cuenta de GitHub creada
- [ ] Cuenta de Supabase creada
- [ ] Cuenta de Vercel creada
- [ ] Vercel conectado con GitHub

---

## 📝 Documentación

- [ ] Has leído la guía de despliegue
- [ ] Entiendes el proceso de 5 pasos
- [ ] Sabes cómo ver los logs en Vercel
- [ ] Sabes cómo acceder al SQL Editor de Supabase

---

## 🧪 Testing Post-Despliegue (Harás esto DESPUÉS)

- [ ] Backend responde en `/health`
- [ ] Frontend carga correctamente
- [ ] Puedes ver la lista de productos
- [ ] Puedes agregar un producto nuevo
- [ ] Puedes realizar una venta
- [ ] El historial se actualiza correctamente
- [ ] No hay errores de CORS
- [ ] La aplicación es rápida y responsiva

---

## 🎯 URLs para Guardar (Completarás DURANTE el despliegue)

```
Supabase Project URL: https://app.supabase.com/project/_______
Backend URL: https://pos-backend-_______.vercel.app
Frontend URL: https://pos-frontend-_______.vercel.app
GitHub Repo: https://github.com/______/pos-system
```

---

## 📞 Recursos Útiles

- [Guía Completa](GUIA_DESPLIEGUE_VERCEL_SUPABASE.md)
- [Resumen Rápido](RESUMEN_DESPLIEGUE.md)
- [Supabase Docs](https://supabase.com/docs)
- [Vercel Docs](https://vercel.com/docs)

---

## ⚠️ Problemas Comunes (Para Referencia)

### No puedo hacer push a GitHub
- Verifica tu configuración de Git: `git config --global user.name "Tu Nombre"`
- Usa un Personal Access Token en lugar de contraseña

### Vercel no encuentra mi proyecto
- Asegúrate de que el repositorio sea público o que Vercel tenga acceso
- Verifica que pusheaste el código a GitHub

### Error de conexión a la base de datos
- Verifica que copiaste correctamente la URL de Supabase
- Asegúrate de reemplazar `[YOUR-PASSWORD]` con tu contraseña real

### Frontend no conecta al backend
- Verifica que `VITE_API_URL` apunte a tu backend de Vercel
- Debe incluir `/api` al final

---

**Listo para desplegar cuando todos los ítems estén marcados** ✅
