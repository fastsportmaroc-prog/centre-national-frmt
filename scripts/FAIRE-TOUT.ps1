# Centre National FRMT — build, push GitHub, démarrage local
$ErrorActionPreference = "Stop"
$Root = "C:\Users\USER\tennis-center"
Set-Location $Root

function Write-Step($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Installez Node.js 20+ : https://nodejs.org" -ForegroundColor Red
  exit 1
}

Write-Step "Dependances"
npm install

Write-Step "Build production (meme test que Vercel)"
npm run build
if ($LASTEXITCODE -ne 0) {
  Write-Host "BUILD ECHEC — corrigez les erreurs ci-dessus." -ForegroundColor Red
  exit $LASTEXITCODE
}
Write-Host "Build OK" -ForegroundColor Green

Write-Step "Publication GitHub (declenche Vercel)"
if (-not (Test-Path .git)) { git init; git branch -M main }
$remote = git remote get-url origin 2>$null
if (-not $remote) {
  git remote add origin https://github.com/fastsportmaroc-prog/centre-national-frmt.git
}
git add .
$porcelain = git status --porcelain
if ($porcelain) {
  git -c user.email="fastsportmaroc-prog@users.noreply.github.com" `
      -c user.name="fastsportmaroc-prog" `
      commit -m "Fix Vercel build + local dev: middleware types, health, login"
}
git push -u origin main 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host "Push GitHub echoue — utilisez GitHub Desktop ou un token PAT." -ForegroundColor Yellow
} else {
  Write-Host "Push OK — Vercel va redeployer." -ForegroundColor Green
}

Write-Step "Serveur local"
if (-not (Test-Path ".env.local")) {
  Copy-Item ".env.example" ".env.local" -ErrorAction SilentlyContinue
  Write-Host "Fichier .env.local cree — verifiez les cles Supabase." -ForegroundColor Yellow
}

$loginUrl = "http://localhost:3000/auth/login"
Write-Host @"

========================================
  SERVEUR LOCAL — NE FERMEZ PAS CETTE FENETRE
========================================
  Quand vous voyez :  Ready
  Ouvrez :  $loginUrl

  Connexion : email + mot de passe Supabase
  (Dashboard > Authentication > Users)

  Arret : Ctrl+C
========================================

"@ -ForegroundColor White

Start-Sleep -Seconds 1
Start-Process $loginUrl
npm run dev
