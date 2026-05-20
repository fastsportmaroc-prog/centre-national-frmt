@echo off
cd /d "C:\Users\USER\tennis-center"
echo === BUILD ===
call npm run build
if errorlevel 1 ( echo BUILD ECHEC & pause & exit /b 1 )
echo.
echo === GIT PUSH ===
git add .
git -c user.email=fastsportmaroc-prog@users.noreply.github.com -c user.name=fastsportmaroc-prog commit -m "Fix Supabase env detection for Vercel production"
git push origin main
echo.
git log -1 --oneline
echo.
echo Sur Vercel : Redeploy SANS cache puis testez /api/health
pause
