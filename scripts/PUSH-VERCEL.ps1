$ErrorActionPreference = "Stop"
Set-Location "C:\Users\USER\tennis-center"

"=== BUILD ===" | Out-File push-log.txt -Encoding utf8
npm run build 2>&1 | Tee-Object -FilePath push-log.txt -Append
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

"=== GIT ===" | Tee-Object -FilePath push-log.txt -Append
git add . 2>&1 | Tee-Object -FilePath push-log.txt -Append
git -c user.email="fastsportmaroc-prog@users.noreply.github.com" -c user.name="fastsportmaroc-prog" commit -m "Fix production Vercel deployment" 2>&1 | Tee-Object -FilePath push-log.txt -Append
git push origin main 2>&1 | Tee-Object -FilePath push-log.txt -Append
git rev-parse HEAD 2>&1 | Tee-Object -FilePath push-log.txt -Append
