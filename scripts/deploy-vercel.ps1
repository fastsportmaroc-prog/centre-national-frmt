# Déploiement Vercel — Centre National FRMT
$ErrorActionPreference = "Stop"
Set-Location "C:\Users\USER\tennis-center"

npm run build
if ($LASTEXITCODE -ne 0) { throw "Build échoué" }

if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
  npm i -g vercel
}

Write-Host @"
Configurer sur Vercel (ou via CLI) :
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  NEXT_PUBLIC_SITE_URL
"@

vercel --prod
Write-Host "URL : voir sortie vercel ci-dessus ou dashboard vercel.com"
