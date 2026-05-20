@echo off
title Centre National FRMT - FAIRE TOUT
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\FAIRE-TOUT.ps1"
pause
