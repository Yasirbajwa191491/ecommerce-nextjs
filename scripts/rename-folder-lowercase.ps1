# Close Cursor/terminals using this project, then from repo root:
#   powershell -ExecutionPolicy Bypass -File .\ecommerce-nextjs\scripts\rename-folder-lowercase.ps1

$repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Set-Location $repoRoot

if (-not (Test-Path "Ecommerce-nextjs")) {
  if (Test-Path "ecommerce-nextjs") {
    Write-Host "Folder is already ecommerce-nextjs."
  } else {
    Write-Host "Project folder not found."
  }
  exit 0
}

Rename-Item "Ecommerce-nextjs" "ecommerce-nextjs-temp"
Rename-Item "ecommerce-nextjs-temp" "ecommerce-nextjs"
Write-Host "Renamed to: $repoRoot\ecommerce-nextjs"
