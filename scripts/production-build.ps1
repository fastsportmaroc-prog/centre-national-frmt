$ErrorActionPreference = "Stop"
Set-Location "C:\Users\USER\tennis-center"

Write-Host "=== npm install ==="
npm install

Write-Host "=== npm run build ==="
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "=== git commit & push ==="
git add .
git -c user.email="fastsportmaroc-prog@users.noreply.github.com" -c user.name="fastsportmaroc-prog" commit -m "Fix production build"
git push

Write-Host "OK commit:" (git rev-parse --short HEAD)
