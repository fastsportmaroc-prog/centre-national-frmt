@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo === Reparation compte FRMT ===
echo.
echo 1) Ajoutez SUPABASE_SERVICE_ROLE_KEY dans .env.local
echo    (Supabase - Settings - API - service_role secret)
echo.
echo 2) Entrez email et mot de passe quand demande
echo.
set /p ACCOUNT_EMAIL=Email [s.abderrazzaq@frmt.ma]: 
if "%ACCOUNT_EMAIL%"=="" set ACCOUNT_EMAIL=s.abderrazzaq@frmt.ma
set /p ACCOUNT_PASS=Mot de passe (6+ caracteres): 
if "%ACCOUNT_PASS%"=="" (
  echo Mot de passe requis.
  pause
  exit /b 1
)
node scripts/repair-compte-frmt.mjs %ACCOUNT_EMAIL% %ACCOUNT_PASS%
echo.
pause
