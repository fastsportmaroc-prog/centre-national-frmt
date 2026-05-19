$ErrorActionPreference = "Stop"
Set-Location "C:\Users\USER\tennis-center"

$imports = Select-String -Path "components\dashboard\DashboardClient.tsx" -Pattern 'import \{ isSupabaseConfigured \}'
if ($imports.Count -gt 1) {
  Write-Error "Doublon isSupabaseConfigured toujours present ($($imports.Count) lignes)"
}

npm run build
git add .
git -c user.email="fastsportmaroc-prog@users.noreply.github.com" -c user.name="fastsportmaroc-prog" commit -m "Fix duplicate import"
git push
Write-Host "OK — commit:" (git rev-parse --short HEAD)
