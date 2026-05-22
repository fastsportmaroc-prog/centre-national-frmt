@echo off
title FRMT - Reactivation locale
chcp 65001 >nul
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\REACTIVER-LOCAL.ps1"
pause
