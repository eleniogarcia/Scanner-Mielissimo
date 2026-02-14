@echo off
title Backup Scanner Mielisimo
color 0E

echo.
echo ========================================
echo    💾 Backup Scanner Mielisimo
echo ========================================
echo.

REM Crear carpeta de backups si no existe
if not exist "%~dp0backups" mkdir "%~dp0backups"

REM Generar nombre con fecha y hora
set "TIMESTAMP=%date:~6,4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%"
set "TIMESTAMP=%TIMESTAMP: =0%"
set "BACKUP_FILE=%~dp0backups\pos_backup_%TIMESTAMP%.sql"

echo [*] Creando backup...
echo [*] Archivo: %BACKUP_FILE%
echo.

REM Hacer backup usando pg_dump
"C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" -U postgres -d pos_db > "%BACKUP_FILE%"

if %errorlevel% equ 0 (
    echo [✓] Backup creado exitosamente
    echo.
    echo 📁 Guardado en: %BACKUP_FILE%
    echo.
    
    REM Contar archivos de backup
    for /f %%A in ('dir /b "%~dp0backups\*.sql" ^| find /c ".sql"') do set COUNT=%%A
    echo Total de backups: %COUNT%
) else (
    echo [✗] Error al crear backup
    echo.
    echo Asegúrate de que PostgreSQL esté corriendo
    echo y que la contraseña de postgres sea correcta
)

echo.
pause
