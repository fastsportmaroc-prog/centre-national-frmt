$ErrorActionPreference = "Stop"
Set-Location "C:\Users\USER\tennis-center"

npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

npx tsc --noEmit 2>&1 | Tee-Object -FilePath tsc-errors.log
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

npm run build 2>&1 | Tee-Object -FilePath build-full.log
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

git add .
git -c user.email="fastsportmaroc-prog@users.noreply.github.com" -c user.name="fastsportmaroc-prog" commit -m "Fix production build"
git push

Write-Host "COMMIT:" (git rev-parse HEAD)
Write-Host "SHORT:" (git rev-parse --short HEAD)
