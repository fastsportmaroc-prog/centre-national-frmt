Set-Location "C:\Users\USER\tennis-center"
npm install
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
git add -A
git -c user.email="fastsportmaroc-prog@users.noreply.github.com" -c user.name="fastsportmaroc-prog" commit -m "fix: isolate Supabase server client from client bundle"
$branch = git branch --show-current
git push -u origin $branch
Write-Host "OK — branche $branch"
