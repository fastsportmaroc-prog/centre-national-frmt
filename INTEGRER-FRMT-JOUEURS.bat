@echo off
cd /d "%~dp0"
echo Integrer 79 joueurs FRMT (fichier JSON pret)
echo.
netstat -ano | findstr ":3000 " >nul 2>&1
if %errorlevel%==0 (
  echo Port 3000 occupe - utilisation du port 3001
  set URL=http://localhost:3001/joueurs
  start "" cmd /c "npm run dev:3001"
) else (
  set URL=http://localhost:3000/joueurs
  start "" cmd /c "npm run dev"
)
timeout /t 8 /nobreak >nul
start "" %URL%
echo.
echo Connectez-vous puis : Joueurs - Integrer classement FRMT
pause
