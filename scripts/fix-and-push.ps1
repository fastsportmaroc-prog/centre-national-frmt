Set-Location "C:\Users\USER\tennis-center"
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
git add .
git -c user.email="fastsportmaroc-prog@users.noreply.github.com" -c user.name="fastsportmaroc-prog" commit -m "Fix duplicate import"
git push
