@echo off
title FRMT - Production Deploy
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\PRODUCTION-DEPLOY.ps1"
if %ERRORLEVEL% EQU 0 (
  echo.
  echo Pour localhost : double-cliquez START-SERVEUR.cmd
  echo.
)
pause
