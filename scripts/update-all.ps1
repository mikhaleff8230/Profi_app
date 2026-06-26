# Обновление зависимостей и проверки: backend (venv, pytest) + mobile (npm, expo, tsc).
# Windows PowerShell 5.1 — без &&.
#
# Из папки project:  powershell -ExecutionPolicy Bypass -File .\scripts\update-all.ps1
# Только mobile:      .\scripts\update-all.ps1 -SkipBackend
# Только backend:     .\scripts\update-all.ps1 -SkipMobile

param(
    [switch]$SkipBackend,
    [switch]$SkipMobile
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$nodeDir = "C:\Program Files\nodejs"
if (Test-Path $nodeDir) { $env:Path = "$nodeDir;$env:Path" }

$exitCode = 0

if (-not $SkipBackend) {
    Write-Host "=== Backend: venv, deps, pytest ===" -ForegroundColor Cyan
    Push-Location (Join-Path $root "backend")
    try {
        & (Join-Path $PWD "run_tests.ps1")
        if ($LASTEXITCODE -ne 0) { $exitCode = $LASTEXITCODE }
    } finally {
        Pop-Location
    }
} else {
    Write-Host "=== Backend: skipped (-SkipBackend) ===" -ForegroundColor DarkGray
}

if (-not $SkipMobile) {
    Write-Host "=== Mobile: npm, expo, tsc ===" -ForegroundColor Cyan
    Push-Location (Join-Path $root "mobile")
    try {
        if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
            Write-Host "npm not found. Install Node.js." -ForegroundColor Red
            exit 1
        }
        & npm.cmd install --no-audit --no-fund
        if ($LASTEXITCODE -ne 0) { $exitCode = $LASTEXITCODE }
        & npx.cmd expo install --fix
        if ($LASTEXITCODE -ne 0) { $exitCode = $LASTEXITCODE }
        & npx.cmd tsc --noEmit
        if ($LASTEXITCODE -ne 0) { $exitCode = $LASTEXITCODE }
    } finally {
        Pop-Location
    }
} else {
    Write-Host "=== Mobile: skipped (-SkipMobile) ===" -ForegroundColor DarkGray
}

if ($exitCode -eq 0) {
    Write-Host "=== Done (exit 0) ===" -ForegroundColor Green
} else {
    Write-Host "=== Finished with errors (exit $exitCode) ===" -ForegroundColor Yellow
}
exit $exitCode
