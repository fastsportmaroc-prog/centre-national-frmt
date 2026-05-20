@echo off
cd /d "%~dp0"
echo Import classement FRMT depuis https://info.frmt.ma/FRMT_CLASSEMENT_WB27
echo.
where node >nul 2>&1 || (echo Node.js requis: https://nodejs.org & pause & exit /b 1)
call npm ls playwright >nul 2>&1
if errorlevel 1 (
  echo Installation Playwright...
  call npm install -D playwright
  call npx playwright install chromium
)
node scripts/import-frmt-classement.mjs
if errorlevel 1 (
  echo Echec import.
  pause
  exit /b 1
)
echo.
echo OK - Fichier mis a jour: data\frmt\classement-top5.json
echo Dans l'app Joueurs, cliquez "Classement FRMT" pour integrer Supabase.
pause
