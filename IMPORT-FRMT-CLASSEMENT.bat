@echo off
cd /d "%~dp0"
echo ========================================
echo  FRMT - 79 joueurs deja dans le fichier
echo  Pas besoin du scrape pour integrer !
echo ========================================
echo.
call npm run integrate:frmt
echo.
echo Si vous voulez quand meme scraper le site WB27:
echo   npm run import:frmt-classement:debug
echo.
pause
