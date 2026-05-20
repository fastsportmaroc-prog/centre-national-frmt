@echo off
title Push GitHub pour Vercel
cd /d "C:\Users\USER\tennis-center"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\PUSH-VERCEL.ps1"
type push-log.txt
pause
