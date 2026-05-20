# Libère le port 3000 (Next.js bloqué EADDRINUSE)
$port = 3000
$conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if (-not $conns) {
  Write-Host "Port $port deja libre."
  exit 0
}
$pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($pid in $pids) {
  $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
  if ($proc) {
    Write-Host "Arret PID $pid ($($proc.ProcessName))..."
    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
  }
}
Start-Sleep -Seconds 1
Write-Host "Port $port libere. Lancez: npm run dev"
