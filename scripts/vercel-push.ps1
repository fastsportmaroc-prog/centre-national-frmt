# Build + push — corrige Vercel
$ErrorActionPreference = "Stop"
Set-Location "C:\Users\USER\tennis-center"

Write-Host "=== npm install ===" -ForegroundColor Cyan
npm install

Write-Host "=== npm run build ===" -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
  Write-Host "BUILD ECHEC — corrigez les erreurs ci-dessus puis relancez." -ForegroundColor Red
  exit $LASTEXITCODE
}

Write-Host "=== git push ===" -ForegroundColor Cyan
git add .
git -c user.email="fastsportmaroc-prog@users.noreply.github.com" -c user.name="fastsportmaroc-prog" commit -m "Fix exportPdfReport ReportMeta typing"
git push

Write-Host "`nOK — Vercel va redéployer. Commit:" (git rev-parse --short HEAD) -ForegroundColor Green
