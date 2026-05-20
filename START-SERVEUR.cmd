@echo off
title SERVEUR LOCAL - Centre National FRMT (port 3000)
cd /d "C:\Users\USER\tennis-center"

echo.
echo ========================================
echo   DEMARRAGE DU SERVEUR sur port 3000
echo   NE FERMEZ PAS CETTE FENETRE
echo ========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo ERREUR: Node.js non installe.
  echo Telechargez: https://nodejs.org
  pause
  exit /b 1
)

if not exist "node_modules\next\package.json" (
  echo Installation des dependances...
  call npm install
)

echo.
echo Lancement npm run dev...
echo Quand vous voyez "Ready", ouvrez:
echo   http://localhost:3000/auth/login
echo.
echo.

start "" "http://localhost:3000/auth/login"
call npm run dev

pause
