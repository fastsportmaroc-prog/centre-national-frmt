# Reactivation complete localhost — FRMT Centre National
$ErrorActionPreference = "Continue"
$ProjectRoot = "C:\Users\USER\tennis-center"
Set-Location $ProjectRoot

function Write-Step($msg) {
  Write-Host "`n>> $msg" -ForegroundColor Cyan
}

function Stop-Port($port) {
  $lines = netstat -ano 2>$null | Select-String ":$port\s" | Select-String "LISTENING"
  foreach ($line in $lines) {
    $parts = ($line -replace '\s+', ' ').Trim().Split(' ')
    $processId = $parts[-1]
    if ($processId -match '^\d+$') {
      taskkill /F /PID $processId 2>$null | Out-Null
      Write-Host "  Port $port libere (PID $processId)" -ForegroundColor DarkGray
    }
  }
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  REACTIVATION LOCALE — FRMT" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

Write-Step "1/6 Arret processus Node bloquants"
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1
Stop-Port 3000
Stop-Port 3001

Write-Step "2/6 Nettoyage cache"
if (Test-Path ".next") {
  Remove-Item -Recurse -Force ".next"
  Write-Host "  .next supprime" -ForegroundColor DarkGray
}
npm cache verify 2>$null | Out-Null

Write-Step "3/6 Verification .env.local"
if (-not (Test-Path ".env.local")) {
  Copy-Item ".env.local.example" ".env.local" -ErrorAction SilentlyContinue
  Write-Host "  .env.local cree depuis .env.local.example" -ForegroundColor Yellow
}

$envContent = Get-Content ".env.local" -Raw -ErrorAction SilentlyContinue
if ($envContent -match "COLLE_ICI|TA_VRAIE") {
  Write-Host "  ATTENTION: placeholders detectes — editez .env.local (cle eyJ)" -ForegroundColor Yellow
}

Write-Step "4/6 Test Supabase"
node scripts/verify-supabase-auth.mjs 2>&1
$verifyOk = $LASTEXITCODE -eq 0

Write-Step "5/6 Installation dependances"
npm install --no-fund --no-audit 2>&1 | Out-Host

Write-Step "6/6 Demarrage serveur"
$port = 3001
Stop-Port $port
$loginUrl = "http://localhost:$port/auth/login"
$healthUrl = "http://localhost:$port/api/health"

Write-Host "`n  URL finale : $loginUrl" -ForegroundColor Green
Write-Host "  Health     : $healthUrl" -ForegroundColor Green

$logFile = Join-Path $ProjectRoot "dev-server.log"
Remove-Item $logFile -ErrorAction SilentlyContinue

$proc = Start-Process -FilePath "npm" -ArgumentList "run", "dev:3001" -WorkingDirectory $ProjectRoot -PassThru -WindowStyle Hidden -RedirectStandardOutput $logFile -RedirectStandardError $logFile

Write-Host "  Attente demarrage (PID $($proc.Id))..." -ForegroundColor DarkGray
$ready = $false
for ($i = 0; $i -lt 45; $i++) {
  Start-Sleep -Seconds 2
  try {
    $r = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    $json = $r.Content | ConvertFrom-Json
    if ($json.ok) {
      $ready = $true
      Write-Host "`n  Supabase configure : $($json.supabaseConfigured)" -ForegroundColor $(if ($json.supabaseConfigured) { "Green" } else { "Red" })
      Write-Host "  Auth pret          : $($json.authKeyOk)" -ForegroundColor $(if ($json.authKeyOk) { "Green" } else { "Yellow" })
      if ($json.hint) { Write-Host "  Hint               : $($json.hint)" -ForegroundColor Yellow }
      break
    }
  } catch {
    # pas encore pret
  }
}

if ($ready) {
  Start-Process $loginUrl
  Write-Host "`n  Navigateur ouvert sur $loginUrl" -ForegroundColor Green
} else {
  Write-Host "`n  Serveur lent ou erreur — consultez dev-server.log" -ForegroundColor Yellow
  if (Test-Path $logFile) {
    Get-Content $logFile -Tail 25
  }
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  Etat verify script : $(if ($verifyOk) { 'OK' } else { 'A VERIFIER (cle eyJ?)' })" -ForegroundColor $(if ($verifyOk) { "Green" } else { "Yellow" })
Write-Host "  Serveur PID        : $($proc.Id)" -ForegroundColor Green
Write-Host "  Pour arreter       : taskkill /F /PID $($proc.Id)" -ForegroundColor DarkGray
Write-Host "========================================`n" -ForegroundColor Green
