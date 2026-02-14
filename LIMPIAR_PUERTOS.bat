@echo off
title Limpiar Puertos - Scanner Mielisimo
color 0E

echo.
echo ========================================
echo    🔧 Limpieza de Puertos
echo ========================================
echo.
echo Esta herramienta libera los puertos 3000 y 5173
echo.

REM Puerto 3000 (Backend)
echo [*] Limpiando puerto 3000 (Backend)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    echo    - Terminando PID %%a
    taskkill /F /PID %%a 2>nul
)

REM Puerto 5173 (Frontend)
echo [*] Limpiando puerto 5173 (Frontend)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173') do (
    echo    - Terminando PID %%a
    taskkill /F /PID %%a 2>nul
)

timeout /t 1 >nul

echo.
echo [✓] Puertos liberados
echo.
echo Ahora puedes iniciar el sistema normalmente con INICIAR_POS.bat
echo.
pause
