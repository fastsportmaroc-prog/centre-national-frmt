# Centre National FRMT — Git + GitHub (fastsportmaroc-prog/centre-national-frmt)
$ErrorActionPreference = "Stop"
$root = "C:\Users\USER\tennis-center"
Set-Location $root

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Host "Installation Git via winget..."
  winget install --id Git.Git -e --accept-source-agreements --accept-package-agreements
  $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
}

git --version
if (-not (Test-Path .git)) { git init }
git add .
git -c user.email="fastsportmaroc-prog@users.noreply.github.com" -c user.name="fastsportmaroc-prog" commit -m "Centre National FRMT" 2>$null
if ($LASTEXITCODE -ne 0) { Write-Host "Commit ignoré (rien de nouveau ou déjà commité)" }

if (Get-Command gh -ErrorAction SilentlyContinue) {
  gh auth status
  gh repo create fastsportmaroc-prog/centre-national-frmt --public --source=. --remote=origin --push 2>$null
  if ($LASTEXITCODE -ne 0) {
    git remote remove origin 2>$null
    git remote add origin https://github.com/fastsportmaroc-prog/centre-national-frmt.git
    git branch -M main 2>$null
    git push -u origin main
  }
} else {
  Write-Host "Installez GitHub CLI: winget install GitHub.cli"
  git remote add origin https://github.com/fastsportmaroc-prog/centre-national-frmt.git 2>$null
  git branch -M main 2>$null
  git push -u origin main
}

Write-Host "Remote:" (git remote get-url origin)
Write-Host "Commit:" (git rev-parse HEAD)
