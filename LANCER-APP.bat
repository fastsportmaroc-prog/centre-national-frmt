@echo off
cd /d "C:\Users\USER\tennis-center"
title FRMT - Serveur en cours...
echo Demarrage Centre National FRMT...
if not exist "node_modules\next" (
  echo Installation npm...
  call npm install
)
start "FRMT Serveur - NE PAS FERMER" cmd /k "cd /d C:\Users\USER\tennis-center && npm run dev"
timeout /t 10 /nobreak >nul
start "" "http://localhost:3000/auth/login"
echo.
echo Navigateur ouvert. Si page blanche : attendez Ready dans la fenetre FRMT Serveur.
exit
