# Guide déploiement Vercel — Centre National FRMT
# Exécuter : clic droit PowerShell > Exécuter, ou :  Set-ExecutionPolicy -Scope Process Bypass; .\scripts\DEPLOY-VERCEL-GUIDE.ps1

$ErrorActionPreference = "Continue"
Set-Location "C:\Users\USER\tennis-center"

Write-Host "`n=== 1. BUILD LOCAL ===" -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
  Write-Host "Corrigez les erreurs TypeScript avant de déployer." -ForegroundColor Red
  exit 1
}
Write-Host "Build OK`n" -ForegroundColor Green

Write-Host "=== 2. GIT / GITHUB ===" -ForegroundColor Cyan
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Host "Installez Git : winget install Git.Git" -ForegroundColor Red
  exit 1
}

if (-not (Test-Path .git)) { git init; git branch -M main }

$remote = git remote get-url origin 2>$null
if (-not $remote) {
  git remote add origin https://github.com/fastsportmaroc-prog/centre-national-frmt.git
  Write-Host "Remote origin ajouté."
}

git add .
git -c user.email="fastsportmaroc-prog@users.noreply.github.com" -c user.name="fastsportmaroc-prog" commit -m "Deploy Centre National FRMT" 2>$null
Write-Host "Tentative git push (connexion GitHub requise)..." -ForegroundColor Yellow
git push -u origin main 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host @"

ECHEC PUSH — utilisez UNE de ces solutions :

A) GitHub Desktop (le plus simple)
   1. Téléchargez https://desktop.github.com
   2. File > Add local repository > C:\Users\USER\tennis-center
   3. Publish repository > fastsportmaroc-prog / centre-national-frmt
   4. Puis connectez Vercel au repo sur vercel.com/new

B) Token GitHub
   1. https://github.com/settings/tokens > Generate new token (classic) > repo
   2. git push
   3. Username : fastsportmaroc-prog
   4. Password : collez le TOKEN (pas le mot de passe GitHub)

C) Vercel CLI SANS GitHub (voir section 3 ci-dessous)

"@ -ForegroundColor Yellow
}

Write-Host "`n=== 3. VERCEL CLI (sans GitHub) ===" -ForegroundColor Cyan
if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
  Write-Host "Installation Vercel CLI..." -ForegroundColor Yellow
  npm install -g vercel
}
Write-Host @"
Lancez manuellement :
  cd C:\Users\USER\tennis-center
  vercel login
  vercel --prod

Ajoutez les variables quand demandé ou sur vercel.com :
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  NEXT_PUBLIC_SITE_URL (URL Vercel après 1er deploy)
"@ -ForegroundColor White

Write-Host "`n=== 4. VERCEL + GITHUB (recommandé) ===" -ForegroundColor Cyan
Write-Host @"
1. https://vercel.com — Connect with GitHub
2. Add New Project > Import fastsportmaroc-prog/centre-national-frmt
3. Environment Variables (Production) :
   NEXT_PUBLIC_SUPABASE_URL = https://kcwvqwvcyiiwalyvhvxz.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = (votre clé .env.local)
4. Deploy
5. Settings > Environment Variables > NEXT_PUBLIC_SITE_URL = https://VOTRE-PROJET.vercel.app
6. Redeploy
"@ -ForegroundColor White
