# Build + commit + push — débloque Vercel (types middleware + config prod)
$ErrorActionPreference = "Stop"
Set-Location "C:\Users\USER\tennis-center"

Write-Host "`n=== Centre National FRMT — publication GitHub / Vercel ===`n" -ForegroundColor Cyan

Write-Host "=== npm install ===" -ForegroundColor Yellow
npm install

Write-Host "`n=== npm run build ===" -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
  Write-Host "`nBUILD ECHEC — corrigez les erreurs TypeScript ci-dessus." -ForegroundColor Red
  exit $LASTEXITCODE
}
Write-Host "Build local OK`n" -ForegroundColor Green

Write-Host "=== git commit + push ===" -ForegroundColor Yellow
git add .
$status = git status --porcelain
if (-not $status) {
  Write-Host "Rien a committer (deja a jour sur disque)." -ForegroundColor Yellow
} else {
  git -c user.email="fastsportmaroc-prog@users.noreply.github.com" -c user.name="fastsportmaroc-prog" commit -m "Fix Vercel build: middleware types + health check"
}
git push origin main
if ($LASTEXITCODE -ne 0) {
  Write-Host @"

ECHEC git push — utilisez GitHub Desktop ou un token :
  https://github.com/settings/tokens
  git push
  utilisateur : fastsportmaroc-prog
  mot de passe : le TOKEN

"@ -ForegroundColor Red
  exit 1
}

$sha = git rev-parse --short HEAD
Write-Host "`nOK — commit $sha pousse sur GitHub." -ForegroundColor Green
Write-Host @"

Prochaines etapes (2 min) :
1. https://vercel.com — projet centre-national-frmt (ou v2)
2. Attendre statut Ready (vert)
3. Settings > Environment Variables (Production) :
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   NEXT_PUBLIC_SITE_URL = https://VOTRE-URL.vercel.app
4. Redeploy
5. Supabase > Authentication > URL Configuration :
   Site URL = votre URL Vercel
   Redirect URLs : https://*.vercel.app/auth/callback

Connexion : https://VOTRE-URL.vercel.app/auth/login
Test config : https://VOTRE-URL.vercel.app/api/health

"@ -ForegroundColor White
