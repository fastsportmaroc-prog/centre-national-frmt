@echo off
cd /d "C:\Users\USER\tennis-center"
echo BUILD AUDIT %date% %time% > build-audit.log
echo. >> build-audit.log
node -v >> build-audit.log 2>&1
echo. >> build-audit.log
call npm install >> build-audit.log 2>&1
echo. >> build-audit.log
call npm run build >> build-audit.log 2>&1
echo EXIT_CODE=%ERRORLEVEL% >> build-audit.log
exit /b %ERRORLEVEL%
