@echo off
cd /d "%~dp0"

:: Controlla se node è installato
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js non trovato. Scaricalo da https://nodejs.org
    pause
    exit /b
)

:: Ferma eventuali sessioni precedenti sulla porta 3001
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3001 "') do (
    taskkill /F /PID %%a >nul 2>&1
)

:: Avvia il server in background senza finestra
powershell -WindowStyle Hidden -Command "Start-Process -FilePath 'node' -ArgumentList 'server.js' -WorkingDirectory '%~dp0' -WindowStyle Hidden"

:: Aspetta che il server sia pronto
timeout /t 2 /nobreak > nul

:: Apri il browser
start "" "http://localhost:3001"

exit
