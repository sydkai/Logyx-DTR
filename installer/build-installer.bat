@echo off
setlocal EnableExtensions
title Logyx DTR — Build Installer
cd /d "%~dp0\.."
call "%~dp0..\BUILD-STANDALONE.bat"
