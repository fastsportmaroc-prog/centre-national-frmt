# Libere le port (Next.js EADDRINUSE)
# $PID est reserve par PowerShell - ne pas l utiliser comme variable de boucle.
param(
  [int]$Port = 3000
)

$conns = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
if (-not $conns) {
  Write-Host "Port $Port deja libre."
  exit 0
}

$processIds = $conns | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($processId in $processIds) {
  $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
  if ($proc) {
    Write-Host "Arret PID $processId ($($proc.ProcessName))..."
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
  }
}

Start-Sleep -Seconds 1

$still = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
if ($still) {
  Write-Host "Attention: port $Port peut-etre encore utilise. Essayez npm run dev:3001"
  exit 1
}

Write-Host "Port $Port libere."
