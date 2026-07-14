# Deploy sync-classements Edge Function to Supabase
# Usage: .\scripts\DEPLOY-SYNC-CLASSEMENTS.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$projectRef = "kcwvqwvcyiiwalyvhvxz"

Write-Host "=== Test fonction distante (avant deploy) ===" -ForegroundColor Cyan
node scripts/test-sync-classements-fn.mjs
Write-Host ""

if (-not $env:SUPABASE_ACCESS_TOKEN) {
  Write-Host "Connexion Supabase requise (une seule fois) :" -ForegroundColor Yellow
  Write-Host "  npx supabase login" -ForegroundColor White
  Write-Host ""
  Write-Host "Ou definir SUPABASE_ACCESS_TOKEN (Dashboard > Account > Access Tokens)" -ForegroundColor Yellow
  Write-Host ""
}

Write-Host "=== Link projet $projectRef ===" -ForegroundColor Cyan
npx supabase link --project-ref $projectRef

Write-Host "=== Deploy sync-classements ===" -ForegroundColor Cyan
npx supabase functions deploy sync-classements --project-ref $projectRef

Write-Host ""
Write-Host "=== Test apres deploy ===" -ForegroundColor Cyan
node scripts/test-sync-classements-fn.mjs

Write-Host ""
Write-Host "Verifiez aussi : Dashboard Supabase > Edge Functions > sync-classements" -ForegroundColor Green
