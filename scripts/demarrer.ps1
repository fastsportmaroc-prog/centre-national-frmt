# Lance l'application en local
Set-Location "C:\Users\USER\tennis-center"
if (-not (Test-Path .env.local)) {
  Copy-Item .env.example .env.local
  Write-Host "Créé .env.local — renseignez Supabase puis relancez."
  exit 1
}
npm run dev
