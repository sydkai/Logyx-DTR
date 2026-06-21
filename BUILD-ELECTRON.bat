@echo off
setlocal EnableExtensions
title Logyx DTR — Electron Installer Build
cd /d "%~dp0\client"

echo.
echo ============================================================
echo   Electron installer build (electron-builder)
echo   Close Logyx DTR before continuing.
echo ============================================================
echo.

call npm run electron:build:clean
if errorlevel 1 (
  echo.
  echo Build failed.
  pause
  exit /b 1
)

echo.
echo Done. Installer output:
echo   client\release-build\Logyx Daily Time Record Setup 1.2.0.exe
echo.
echo (Old locked client\release folder is ignored — you may delete it later.)
echo.
pause
