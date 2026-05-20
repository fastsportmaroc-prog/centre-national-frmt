@echo off
cd /d "C:\Users\USER\tennis-center"
echo === BUILD ===
call npm run build
if errorlevel 1 (
  echo BUILD ECHEC - voir erreurs ci-dessus
  pause
  exit /b 1
)
echo.
echo === PUSH GITHUB ===
git add .
git -c user.email=fastsportmaroc-prog@users.noreply.github.com -c user.name=fastsportmaroc-prog commit -m "Fix production Vercel deployment"
git push origin main
echo.
echo Si push OK : attendez 2 min sur Vercel puis Refresh
git log -1 --oneline
pause
