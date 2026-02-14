# 🚀 Despliegue Rápido - Resumen en 5 Pasos

Este es un resumen ultra rápido. Para la guía completa, ver [GUIA_DESPLIEGUE_VERCEL_SUPABASE.md](GUIA_DESPLIEGUE_VERCEL_SUPABASE.md)

---

## 1️⃣ SUPABASE (Base de Datos)

1. Crear cuenta en https://supabase.com
2. **New Project** → Nombre: `pos-system` → Crear contraseña
3. **Settings** → **Database** → Copiar **"Connection string (URI)"**
4. **SQL Editor** → Pegar contenido de `supabase_setup.sql` → **Run**

✅ **Guarda la URL**: `postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres`

---

## 2️⃣ GITHUB (Código)

```bash
cd C:\Users\test\Desktop\pos-system
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/TU-USUARIO/pos-system.git
git push -u origin main
```

---

## 3️⃣ VERCEL - BACKEND

1. Ir a https://vercel.com → **New Project**
2. Importar repositorio `pos-system`
3. Configurar:
   - **Root Directory**: `backend`
   - **Environment Variables**:
     - `DATABASE_URL` = (pega la URL de Supabase)
     - `NODE_ENV` = `production`
4. **Deploy**

✅ **Guarda la URL**: `https://pos-backend-xxx.vercel.app`

---

## 4️⃣ VERCEL - FRONTEND

1. Vercel → **New Project**
2. Seleccionar `pos-system` nuevamente
3. Configurar:
   - **Root Directory**: `frontend`
   - **Framework**: Vite
   - **Environment Variables**:
     - `VITE_API_URL` = `https://pos-backend-xxx.vercel.app/api`
4. **Deploy**

✅ **Tu app**: `https://pos-frontend-xxx.vercel.app`

---

## 5️⃣ VERIFICAR

- Backend: `https://pos-backend-xxx.vercel.app/health` → debe responder `{"status":"ok"}`
- Frontend: `https://pos-frontend-xxx.vercel.app` → debe cargar la app

---

## 🔄 Actualizar Aplicación

```bash
# Hacer cambios en tu código
git add .
git commit -m "Descripción del cambio"
git push
# Vercel desplegará automáticamente
```

---

## ⚡ Comandos Útiles

```bash
# Ver logs del backend
vercel logs https://pos-backend-xxx.vercel.app

# Conectar a Supabase desde terminal (opcional)
psql "postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres"
```

---

## 🐛 Problemas Comunes

### Error de conexión a BD
→ Verifica `DATABASE_URL` en Vercel → Settings → Environment Variables

### Frontend no carga
→ Verifica `VITE_API_URL` → debe terminar en `/api`

### Error 404
→ Verifica que `vercel.json` exista en la carpeta correspondiente

---

## 📞 URLs Importantes

- Supabase Dashboard: https://supabase.com/dashboard
- Vercel Dashboard: https://vercel.com/dashboard
- GitHub Repo: https://github.com/TU-USUARIO/pos-system

---

**Tiempo estimado**: 15-20 minutos ⏱️  
**Costo**: $0 (100% gratis) 💰
