@echo off
title Logyx DTR — Setup as CLIENT (Manager / Employee PC)
setlocal EnableExtensions

echo.
echo ============================================================
echo   Connect this PC to the MAIN SERVER
echo.
echo   Use this on Manager, Assistant Manager, or Employee PCs
echo   that should share the same scans and leave data.
echo ============================================================
echo.

set /p HOST_IP=Enter the HOST PC IP address (example 192.168.1.10): 

if "%HOST_IP%"=="" (
  echo No IP entered. Cancelled.
  pause
  exit /b 1
)

set "CFG=%APPDATA%\Logyx DTR"
if not exist "%CFG%" mkdir "%CFG%"

(
echo {
echo   "role": "client",
echo   "serverUrl": "http://%HOST_IP%:3001"
echo }
) > "%CFG%\config.json"

echo.
echo This PC is configured as CLIENT.
echo It will connect to: http://%HOST_IP%:3001
echo.
echo Make sure:
echo   1. The HOST PC is running Logyx DTR
echo   2. All PCs are on the same office network
echo   3. Windows Firewall on the HOST allows port 3001
echo.
echo Config saved: %CFG%\config.json
echo.
pause
