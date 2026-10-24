@echo off
title Starting Deepfake Audio Detector
echo ============================================================
echo   DeepFake Audio Analyzer
echo   Deepfake Audio Detection & Forensic Spectral Analyzer
echo ============================================================
echo.
echo [1/3] Starting Backend API Server (Port 5000)...
start "Deepfake Backend API (Port 5000)" cmd /k "cd /d "%~dp0backend" && node server.js"

timeout /t 3 /nobreak >nul

echo [2/3] Starting Frontend Web Server (Port 3000)...
start "Deepfake Frontend (Port 3000)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

timeout /t 3 /nobreak >nul

echo [3/3] Launching Web Browser at http://localhost:3000 ...
start http://localhost:3000

echo.
echo ============================================================
echo   System running successfully!
echo   Frontend : http://localhost:3000
echo   Backend  : http://localhost:5000/api/v1/health
echo ============================================================
echo Keep the backend and frontend terminal windows open.
pause
