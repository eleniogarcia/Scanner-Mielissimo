@echo off
echo ========================================
echo  VERIFICACION PRE-DESPLIEGUE - POS SYSTEM
echo ========================================
echo.

echo [1/5] Verificando estructura de archivos...
if exist "backend\vercel.json" (
    echo [OK] backend\vercel.json existe
) else (
    echo [ERROR] backend\vercel.json NO existe
    set ERROR=1
)

if exist "frontend\vercel.json" (
    echo [OK] frontend\vercel.json existe
) else (
    echo [ERROR] frontend\vercel.json NO existe
    set ERROR=1
)

if exist "backend\.env.example" (
    echo [OK] backend\.env.example existe
) else (
    echo [ERROR] backend\.env.example NO existe
    set ERROR=1
)

if exist "frontend\.env.example" (
    echo [OK] frontend\.env.example existe
) else (
    echo [ERROR] frontend\.env.example NO existe
    set ERROR=1
)

if exist "supabase_setup.sql" (
    echo [OK] supabase_setup.sql existe
) else (
    echo [ERROR] supabase_setup.sql NO existe
    set ERROR=1
)

echo.
echo [2/5] Verificando .gitignore...
if exist ".gitignore" (
    findstr /C:".env" .gitignore >nul
    if %ERRORLEVEL%==0 (
        echo [OK] .gitignore protege archivos .env
    ) else (
        echo [WARN] .gitignore no incluye .env
    )
) else (
    echo [ERROR] .gitignore NO existe
    set ERROR=1
)

echo.
echo [3/5] Verificando archivos .env locales...
if exist "backend\.env" (
    echo [OK] backend\.env existe (para desarrollo local)
    echo [ALERT] VERIFICA que .env NO este en tu repositorio Git
) else (
    echo [WARN] backend\.env no existe (necesario para desarrollo local)
)

if exist "frontend\.env" (
    echo [OK] frontend\.env existe (para desarrollo local)
    echo [ALERT] VERIFICA que .env NO este en tu repositorio Git
) else (
    echo [INFO] frontend\.env no existe (opcional)
)

echo.
echo [4/5] Verificando node_modules...
if exist "backend\node_modules" (
    echo [OK] backend\node_modules existe
) else (
    echo [WARN] backend\node_modules NO existe - ejecuta: cd backend ^&^& npm install
)

if exist "frontend\node_modules" (
    echo [OK] frontend\node_modules existe
) else (
    echo [WARN] frontend\node_modules NO existe - ejecuta: cd frontend ^&^& npm install
)

echo.
echo [5/5] Verificando Git...
git --version >nul 2>&1
if %ERRORLEVEL%==0 (
    echo [OK] Git esta instalado
    
    if exist ".git" (
        echo [OK] Repositorio Git inicializado
        
        git remote -v | findstr "origin" >nul
        if %ERRORLEVEL%==0 (
            echo [OK] Remote 'origin' configurado
            for /f "tokens=*" %%i in ('git remote get-url origin') do echo     URL: %%i
        ) else (
            echo [WARN] Remote 'origin' NO configurado todavia
            echo     Configura con: git remote add origin https://github.com/TU-USUARIO/pos-system.git
        )
    ) else (
        echo [WARN] Repositorio Git NO inicializado
        echo     Ejecuta: git init
    )
) else (
    echo [ERROR] Git NO esta instalado
    set ERROR=1
)

echo.
echo ========================================
if defined ERROR (
    echo  RESULTADO: HAY ERRORES QUE CORREGIR
    echo ========================================
    echo.
    echo Por favor corrige los errores antes de desplegar.
) else (
    echo  RESULTADO: LISTO PARA DESPLEGAR!
    echo ========================================
    echo.
    echo Proximos pasos:
    echo 1. Sube tu codigo a GitHub
    echo 2. Configura Supabase
    echo 3. Despliega en Vercel
    echo.
    echo Lee GUIA_DESPLIEGUE_VERCEL_SUPABASE.md para instrucciones completas
)

echo.
pause
