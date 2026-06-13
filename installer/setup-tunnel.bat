@echo off
title Logyx DTR - Cloudflare Tunnel Setup
cd /d "%~dp0"
echo ============================================
echo  Logyx DTR -- Cloudflare Tunnel Setup
echo ============================================
echo.
echo This script will install and configure Cloudflare Tunnel
echo so you can access Logyx DTR from anywhere.
echo.
echo REQUIREMENTS:
echo   - A Cloudflare account (free at https://dash.cloudflare.com/sign-up)
echo   - Logyx DTR server must be running on this PC
echo.
pause

:: ── Step 1: Redirect to Cloudflare Zero Trust dashboard ──
echo.
echo STEP 1: Login to Cloudflare
echo.
echo A browser will open. Log in to your Cloudflare account,
echo then go to Zero Trust ^> Networks ^> Tunnels ^> Create a tunnel.
echo.
echo Use the token they give you in the next step.
echo.
start https://one.dash.cloudflare.com
pause

:: ── Step 2: Ask for token ──
echo.
echo STEP 2: Tunnel Token
echo.
set /p CF_TOKEN="Paste the tunnel token here and press Enter: "

if "%CF_TOKEN%"=="" (
    echo No token entered. Exiting.
    pause
    exit /b
)

:: ── Step 3: Download cloudflared ──
echo.
echo STEP 3: Downloading cloudflared...
curl -sL -o cloudflared.msi https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.msi
echo Installing...
msiexec /i cloudflared.msi /quiet /norestart
del cloudflared.msi

:: ── Step 4: Install as a service ──
echo.
echo STEP 4: Installing tunnel as a Windows service...
cd /d "%PROGRAMFILES%\Cloudflare\Cloudflare WARP"
cloudflared.exe service install %CF_TOKEN%

echo.
echo ============================================
echo  SETUP COMPLETE
echo ============================================
echo.
echo Next steps:
echo   1. Restart or run: net start "Cloudflare Tunnel"
echo   2. Go back to Cloudflare Zero Trust dashboard
echo   3. In your tunnel, add a Public Hostname:
echo      - Subdomain: your-choice
echo      - Domain: (leave blank or pick one)
echo      - Type: HTTP
echo      - URL: localhost:3001
echo   4. Access your DTR at: https://your-choice.trycloudflare.com
echo.
pause
