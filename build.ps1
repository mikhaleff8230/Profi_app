# Full web build (frontend + admin). ASCII only for Windows PowerShell 5.1.
# Run from repo root:  .\build.ps1

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
Set-Location $root

$nodeDir = "C:\Program Files\nodejs"
if (Test-Path $nodeDir) {
    $env:Path = "$nodeDir;$env:Path"
}

$npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $npm) {
    Write-Host "npm not found. Add Node.js to PATH (e.g. C:\Program Files\nodejs)." -ForegroundColor Red
    exit 1
}

Write-Host "=== npm run build (root: frontend + admin) ===" -ForegroundColor Green
& npm.cmd run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "OK: frontend/build, admin/dist" -ForegroundColor Green
exit 0
