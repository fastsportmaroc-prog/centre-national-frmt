# MISSION PRODUCTION — build, push, serveur local
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host "`n========== CENTRE NATIONAL FRMT — MISSION PRODUCTION ==========`n" -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "ERREUR: installez Node.js 20+ depuis https://nodejs.org" -ForegroundColor Red
  exit 1
}
Write-Host "Node: $(node -v)" -ForegroundColor Gray

Write-Host "`n[1/4] npm install" -ForegroundColor Yellow
npm install

Write-Host "`n[2/4] npm run build (test identique Vercel)" -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
  Write-Host "`nBUILD ECHEC — corrigez les erreurs ci-dessus avant push." -ForegroundColor Red
  exit $LASTEXITCODE
}
Write-Host "BUILD OK" -ForegroundColor Green

Write-Host "`n[3/4] git push GitHub" -ForegroundColor Yellow
if (-not (Test-Path .git)) { git init; git branch -M main }
if (-not (git remote get-url origin 2>$null)) {
  git remote add origin https://github.com/fastsportmaroc-prog/centre-national-frmt.git
}
git add .
if (git status --porcelain) {
  git -c user.email="fastsportmaroc-prog@users.noreply.github.com" `
      -c user.name="fastsportmaroc-prog" `
      commit -m "Fix production deployment FRMT"
}
git push -u origin main
if ($LASTEXITCODE -eq 0) {
  Write-Host "Push GitHub OK — Vercel redeploy en cours." -ForegroundColor Green
} else {
  Write-Host "Push echoue — utilisez GitHub Desktop puis redeploy Vercel." -ForegroundColor Yellow
}

Write-Host "`n[4/4] Serveur local (NE PAS FERMER)" -ForegroundColor Yellow
Write-Host "URL: http://localhost:3000/auth/login`n" -ForegroundColor Green
Start-Process "http://localhost:3000/auth/login"
npm run dev
