@echo off
setlocal EnableExtensions
title Logyx DTR — Standalone Installer Build (RECOMMENDED)
cd /d "%~dp0"

echo.
echo ============================================================
echo   Logyx DTR — Standalone Offline Installer Build
echo   RECOMMENDED for guard-house single PC setup.
echo   No internet required on the PC where the app is installed.
echo.
echo   Alternative: BUILD-ELECTRON.bat (electron-builder / NSIS)
echo ============================================================
echo.

echo [0/5] Closing Logyx if running...
taskkill /F /IM "Logyx Daily Time Record.exe" /T >nul 2>&1
taskkill /F /IM electron.exe /T >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001 " ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
ping -n 3 127.0.0.1 >nul

echo.
echo [1/5] Building web app...
cd client
call npm run build:standalone
if errorlevel 1 (
  echo.
  echo Build failed at client step.
  pause
  exit /b 1
)

echo.
echo [2/5] Building SQLite database...
cd ..\server
call npm run build:db
if errorlevel 1 (
  echo.
  echo Build failed at database step.
  pause
  exit /b 1
)

echo.
echo [2b/5] Syncing bundled Node runtime for native modules...
cd ..\server
call npm run prepare:installer
if errorlevel 1 (
  echo.
  echo Failed to sync bundled Node — better-sqlite3 may not load in the installer.
  pause
  exit /b 1
)

echo.
echo [2c/5] Syncing app icon from client\public\icon.ico...
copy /Y "..\client\public\icon.ico" "..\installer\app.ico" >nul
if errorlevel 1 (
  echo.
  echo Failed to copy icon.ico — installer icons may be missing.
  pause
  exit /b 1
)

echo.
echo [3/5] Smoke-testing browser launcher...
cd ..\installer
node smoke-test-launcher.js
if errorlevel 1 (
  echo.
  echo Launcher smoke test failed.
  pause
  exit /b 1
)

echo.
echo [4/5] Compiling installer...

set "ISCC="
if exist "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" set "ISCC=C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
if exist "C:\Program Files\Inno Setup 6\ISCC.exe" set "ISCC=C:\Program Files\Inno Setup 6\ISCC.exe"
if exist "%LOCALAPPDATA%\Programs\Inno Setup 6\ISCC.exe" set "ISCC=%LOCALAPPDATA%\Programs\Inno Setup 6\ISCC.exe"

if defined ISCC (
  "%ISCC%" "setup.iss"
  if errorlevel 1 (
    echo.
    echo Inno Setup compile failed.
    pause
    exit /b 1
  )
) else (
  echo Inno Setup 6 not found.
  echo Install from: https://jrsoftware.org/isdl.php
  echo Then open installer\setup.iss and click Compile.
  pause
  exit /b 1
)

echo.
echo [5/5] Done.
echo.
echo Standalone installer created:
echo   installer\LogyxDTR-Setup.exe
echo.
echo Copy that single file to any Windows PC and run it.
echo No Node.js, PostgreSQL, GitHub, or internet needed on that PC.
echo.
pause
