@echo off
cd /d "%~dp0"
echo Demarrage sur http://localhost:3001 (port 3000 occupe)
call npm run dev:3001
