@echo off
title Detener Scanner Mielisimo POS
color 0C

echo.
echo ========================================
echo    🛑 Deteniendo Scanner Mielisimo
echo ========================================
echo.

REM Matar procesos de Node.js en los puertos usados
echo [*] Deteniendo backend (puerto 3000)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do taskkill /F /PID %%a 2>nul

echo [*] Deteniendo frontend (puerto 5173)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173') do taskkill /F /PID %%a 2>nul

echo [*] Cerrando todas las ventanas de cmd relacionadas...
taskkill /FI "WINDOWTITLE eq Backend*" /F 2>nul
taskkill /FI "WINDOWTITLE eq Frontend*" /F 2>nul

timeout /t 2 >nul

echo.
echo [✓] Sistema detenido
echo.
echo PostgreSQL sigue corriendo en segundo plano
echo (esto es normal y correcto)
echo.
pause
