$ErrorActionPreference = "Continue"
Set-Location "C:\Users\USER\tennis-center"
$log = "C:\Users\USER\tennis-center\deploy-frmt-output.log"
Remove-Item $log -ErrorAction SilentlyContinue

function Log($msg) {
  $line = "$(Get-Date -Format 'HH:mm:ss') $msg"
  Write-Host $line
  Add-Content -Path $log -Value $line -Encoding utf8
}

Log "=== npm install ==="
npm install 2>&1 | ForEach-Object { Log $_ }
$installExit = $LASTEXITCODE
Log "NPM_INSTALL_EXIT: $installExit"
if ($installExit -ne 0) { exit $installExit }

Log "=== npm run build ==="
npm run build 2>&1 | ForEach-Object { Log $_ }
$buildExit = $LASTEXITCODE
Log "NPM_BUILD_EXIT: $buildExit"
if ($buildExit -ne 0) { exit $buildExit }

Log "=== git add . ==="
git add . 2>&1 | ForEach-Object { Log $_ }
Log "GIT_ADD_EXIT: $LASTEXITCODE"

Log "=== git commit ==="
git -c user.email="fastsportmaroc-prog@users.noreply.github.com" -c user.name="fastsportmaroc-prog" commit -m "Fix production deployment FRMT" 2>&1 | ForEach-Object { Log $_ }
Log "GIT_COMMIT_EXIT: $LASTEXITCODE"

Log "=== git push origin main ==="
git push origin main 2>&1 | ForEach-Object { Log $_ }
Log "GIT_PUSH_EXIT: $LASTEXITCODE"

Log "=== DONE ==="
exit $LASTEXITCODE
