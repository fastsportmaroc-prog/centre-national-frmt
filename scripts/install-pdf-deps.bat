@echo off
cd /d "%~dp0.."
echo Installation jspdf pour export PDF natif...
call npm install jspdf@3.0.1 jspdf-autotable@5.0.2
if exist node_modules\jspdf\package.json (
  echo OK - jspdf installe. Redemarrez: npm run dev
) else (
  echo ERREUR - jspdf non installe. Verifiez npm et votre connexion.
)
pause
