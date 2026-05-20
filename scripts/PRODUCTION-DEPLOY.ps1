# Production FRMT — build 100% + push GitHub (declenche Vercel)
$ErrorActionPreference = "Stop"
Set-Location "C:\Users\USER\tennis-center"

Write-Host "`n========== CENTRE NATIONAL FRMT — DEPLOIEMENT ==========`n" -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "ERREUR: installez Node.js 20+ depuis https://nodejs.org" -ForegroundColor Red
  exit 1
}

Write-Host "[1/4] npm install" -ForegroundColor Yellow
npm install

Write-Host "`n[2/4] npm run build (meme test que Vercel)" -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
  Write-Host "`nECHEC BUILD — corrigez les erreurs TypeScript ci-dessus." -ForegroundColor Red
  exit $LASTEXITCODE
}
Write-Host "BUILD OK`n" -ForegroundColor Green

Write-Host "[3/4] git commit + push" -ForegroundColor Yellow
if (-not (Test-Path .git)) { git init; git branch -M main }
if (-not (git remote get-url origin 2>$null)) {
  git remote add origin https://github.com/fastsportmaroc-prog/centre-national-frmt.git
}
git add .
$changes = git status --porcelain
if ($changes) {
  git -c user.email="fastsportmaroc-prog@users.noreply.github.com" `
      -c user.name="fastsportmaroc-prog" `
      commit -m "Fix production deployment FRMT"
} else {
  Write-Host "Aucun changement a committer." -ForegroundColor Gray
}
git push -u origin main
if ($LASTEXITCODE -ne 0) {
  Write-Host "`nPush echoue — GitHub Desktop ou token PAT requis." -ForegroundColor Red
  exit 1
}
$sha = git rev-parse --short HEAD
Write-Host "Push OK ($sha)`n" -ForegroundColor Green

Write-Host "[4/4] Variables Vercel (a verifier sur vercel.com)" -ForegroundColor Yellow
Write-Host @"
  NEXT_PUBLIC_SUPABASE_URL=https://kcwvqwvcyiiwalyvhvxz.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=(votre cle .env.local)
  NEXT_PUBLIC_SITE_URL=https://VOTRE-PROJET.vercel.app
  Puis Redeploy.

"@ -ForegroundColor White

Write-Host "========== TERMINE — attendez Ready sur Vercel (1-2 min) ==========`n" -ForegroundColor Green
