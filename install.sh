#!/bin/bash

echo "=================================="
echo "🏪 Sistema POS - Instalación Rápida"
echo "=================================="
echo ""

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_message() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[i]${NC} $1"
}

# Verificar Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js no está instalado. Por favor instala Node.js v18 o superior."
    exit 1
fi

print_message "Node.js $(node --version) encontrado"

# Verificar PostgreSQL
if ! command -v psql &> /dev/null; then
    print_error "PostgreSQL no está instalado. Por favor instala PostgreSQL."
    exit 1
fi

print_message "PostgreSQL encontrado"

echo ""
print_info "Configurando Backend..."
echo ""

# Backend
cd backend

# Instalar dependencias
print_info "Instalando dependencias del backend..."
npm install

if [ $? -ne 0 ]; then
    print_error "Error instalando dependencias del backend"
    exit 1
fi

print_message "Dependencias del backend instaladas"

# Crear archivo .env si no existe
if [ ! -f .env ]; then
    print_info "Creando archivo .env..."
    cp .env.example .env
    print_message "Archivo .env creado. Por favor configura tus credenciales de PostgreSQL"
    echo ""
    echo "Edita backend/.env y configura:"
    echo "DATABASE_URL=postgresql://usuario:password@localhost:5432/pos_db"
    echo ""
    read -p "Presiona Enter cuando hayas configurado el archivo .env..."
fi

# Preguntar si crear la base de datos
echo ""
read -p "¿Quieres crear la base de datos 'pos_db' ahora? (s/n): " create_db

if [ "$create_db" = "s" ] || [ "$create_db" = "S" ]; then
    print_info "Creando base de datos..."
    
    read -p "Usuario de PostgreSQL (default: postgres): " pg_user
    pg_user=${pg_user:-postgres}
    
    createdb -U $pg_user pos_db 2>/dev/null
    
    if [ $? -eq 0 ]; then
        print_message "Base de datos 'pos_db' creada"
    else
        print_info "La base de datos ya existe o hubo un error"
    fi
fi

# Ejecutar migraciones
echo ""
print_info "Ejecutando migraciones..."
npm run migrate

if [ $? -ne 0 ]; then
    print_error "Error ejecutando migraciones"
    exit 1
fi

print_message "Migraciones completadas"

cd ..

echo ""
print_info "Configurando Frontend..."
echo ""

# Frontend
cd frontend

# Instalar dependencias
print_info "Instalando dependencias del frontend..."
npm install

if [ $? -ne 0 ]; then
    print_error "Error instalando dependencias del frontend"
    exit 1
fi

print_message "Dependencias del frontend instaladas"

# Crear archivo .env si no existe
if [ ! -f .env ]; then
    print_info "Creando archivo .env para frontend..."
    cp .env.example .env
    print_message "Archivo .env del frontend creado"
fi

cd ..

echo ""
echo "=================================="
print_message "¡Instalación completada!"
echo "=================================="
echo ""
echo "Para iniciar el sistema:"
echo ""
echo "Backend (Terminal 1):"
echo "  cd backend"
echo "  npm run dev"
echo ""
echo "Frontend (Terminal 2):"
echo "  cd frontend"
echo "  npm run dev"
echo ""
echo "Luego visita: http://localhost:5173"
echo ""
print_info "Documentación disponible en README.md"
echo ""
