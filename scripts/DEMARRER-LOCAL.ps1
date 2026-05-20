# Démarre l'app en local (obligatoire pour que localhost fonctionne)
$ErrorActionPreference = "Stop"
Set-Location "C:\Users\USER\tennis-center"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js n'est pas installé. Installez-le : https://nodejs.org (version 20+)" -ForegroundColor Red
  exit 1
}

Write-Host "`n=== Installation des dependances ===" -ForegroundColor Cyan
npm install

if (-not (Test-Path ".env.local")) {
  Write-Host "`nATTENTION : fichier .env.local manquant." -ForegroundColor Yellow
  Write-Host "Copiez .env.example vers .env.local et renseignez Supabase.`n" -ForegroundColor Yellow
}

$loginUrl = "http://localhost:3000/auth/login"
Write-Host "`n=== Demarrage du serveur (ne fermez PAS cette fenetre) ===" -ForegroundColor Cyan
Write-Host "Quand vous voyez 'Ready', ouvrez : $loginUrl`n" -ForegroundColor Green

Start-Sleep -Seconds 2
Start-Process $loginUrl

npm run dev
