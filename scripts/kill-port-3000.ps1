# Libere le port (Next.js EADDRINUSE)
# $PID est reserve par PowerShell - ne pas l utiliser comme variable de boucle.
param(
  [int]$Port = 3000
)

function Get-PortProcessIds([int]$TargetPort) {
  $ids = @()
  try {
    $conns = Get-NetTCPConnection -LocalPort $TargetPort -State Listen -ErrorAction SilentlyContinue
    if ($conns) {
      $ids += $conns | Select-Object -ExpandProperty OwningProcess -Unique
    }
  } catch {
    # Fallback netstat (Windows sans module NetTCPIP admin)
  }

  if ($ids.Count -eq 0) {
    $lines = netstat -ano | Select-String ":$TargetPort\s"
    foreach ($line in $lines) {
      if ($line -match '\s(\d+)\s*$') {
        $ids += [int]$Matches[1]
      }
    }
  }

  return $ids | Where-Object { $_ -gt 0 } | Select-Object -Unique
}

$processIds = Get-PortProcessIds -TargetPort $Port
if (-not $processIds -or $processIds.Count -eq 0) {
  Write-Host "Port $Port deja libre."
  exit 0
}

foreach ($processId in $processIds) {
  $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
  if ($proc) {
    Write-Host "Arret PID $processId ($($proc.ProcessName))..."
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
  }
}

Start-Sleep -Seconds 2

$remaining = Get-PortProcessIds -TargetPort $Port
if ($remaining -and $remaining.Count -gt 0) {
  Write-Host "Attention: port $Port encore utilise (PID: $($remaining -join ', '))."
  Write-Host "Fermez le terminal qui lance 'next dev' ou relancez kill-port:3001."
  exit 1
}

Write-Host "Port $Port libere."
exit 0
