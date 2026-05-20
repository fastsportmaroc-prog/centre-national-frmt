@echo off
title MISSION PRODUCTION - Centre National FRMT
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\MISSION-PRODUCTION.ps1"
pause
