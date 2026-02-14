@echo off
title Scanner Mielisimo - Sistema POS
color 0A

echo.
echo ========================================
echo    🍯 Scanner Mielisimo POS
echo ========================================
echo.
echo Iniciando sistema...
echo.

REM Limpiar puertos ocupados
echo [*] Limpiando puertos anteriores...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173') do taskkill /F /PID %%a 2>nul
timeout /t 2 >nul
echo [✓] Puertos liberados
echo.

REM Verificar si PostgreSQL está corriendo
sc query postgresql-x64-16 | find "RUNNING" >nul
if %errorlevel% neq 0 (
    echo [!] Iniciando PostgreSQL...
    net start postgresql-x64-16
    timeout /t 2 >nul
)

echo [✓] PostgreSQL activo
echo.

REM Iniciar Backend
echo [*] Iniciando servidor backend...
cd "%~dp0backend"
start "Backend - Scanner Mielisimo" cmd /k "color 0E && title Backend API - Puerto 3000 && npm run dev"
timeout /t 3 >nul

echo [✓] Backend iniciado en puerto 3000
echo.

REM Iniciar Frontend
echo [*] Iniciando interfaz web...
cd "%~dp0frontend"
start "Frontend - Scanner Mielisimo" cmd /k "color 0B && title Frontend Web - Puerto 5173 && npm run dev"
timeout /t 5 >nul

echo [✓] Frontend iniciado en puerto 5173
echo.
echo ========================================
echo    ✅ Sistema listo!
echo ========================================
echo.
echo Abriendo navegador en 3 segundos...
echo.
timeout /t 3 >nul

REM Abrir navegador automáticamente
start http://localhost:5173

echo.
echo 💡 Instrucciones:
echo    - El sistema se abrió en tu navegador
echo    - NO CIERRES las ventanas negras (Backend/Frontend)
echo    - Para detener: Cierra las 2 ventanas negras
echo.
echo Presiona cualquier tecla para minimizar esta ventana...
pause >nul
exit
