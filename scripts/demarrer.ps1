# Demarrage propre (ASCII only)
Set-Location $PSScriptRoot\..

Write-Host "FRMT Centre National - demarrage" -ForegroundColor Cyan

& "$PSScriptRoot\kill-port-3000.ps1" -Port 3000
& "$PSScriptRoot\kill-port-3000.ps1" -Port 3001

if (Test-Path ".next") {
  Write-Host "Suppression cache .next"
  Remove-Item -Recurse -Force ".next" -ErrorAction SilentlyContinue
}

$url = "http://localhost:3001/auth/login"
Write-Host ""
Write-Host $url -ForegroundColor Green
Write-Host ""

npm run dev:3001
