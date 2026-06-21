@echo off
title Logyx DTR — Setup as HOST (Main Server)
setlocal EnableExtensions

set "CFG=%APPDATA%\Logyx DTR"
if not exist "%CFG%" mkdir "%CFG%"

(
echo {
echo   "role": "host",
echo   "serverUrl": "http://localhost:3001"
echo }
) > "%CFG%\config.json"

echo.
echo ============================================================
echo   This PC is now the MAIN SERVER (HOST).
echo.
echo   - Database lives on THIS computer
echo   - Scans and leave requests from all PCs are saved here
echo   - Keep this PC ON during office hours
echo   - Run Logyx DTR normally (LogyxDTR.cmd)
echo.
echo   Other PCs must use "Setup-As-Client.bat" and enter
echo   this PC's IP address.
echo ============================================================
echo.
echo Config saved: %CFG%\config.json
echo.
pause
