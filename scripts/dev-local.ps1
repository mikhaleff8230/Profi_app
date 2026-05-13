# Local dev without Docker: API on :8001 + admin Vite on :5173.
# From repo root:  powershell -ExecutionPolicy Bypass -File scripts\dev-local.ps1
# Stops API process when you close this window or Ctrl+C (after npm dev exits).

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$backend = Join-Path $root "backend"
$admin = Join-Path $root "admin"
$nodeDir = "C:\Program Files\nodejs"
if (Test-Path $nodeDir) { $env:Path = "$nodeDir;$env:Path" }

function Resolve-VenvPython {
    param([string]$Base)
    foreach ($name in @("python.exe", "Python.exe")) {
        $p = Join-Path $Base ".venv\Scripts\$name"
        if (Test-Path -LiteralPath $p) { return (Resolve-Path -LiteralPath $p).ProviderPath }
    }
    return $null
}

function Ensure-BackendVenv {
    param([string]$BackendDir)
    Set-Location $BackendDir
    if (-not (Test-Path ".env")) {
        Copy-Item ".env.example" ".env"
        Write-Host "Created backend/.env from .env.example" -ForegroundColor Yellow
    }
    $venvPy = Resolve-VenvPython $BackendDir
    if (-not $venvPy) {
        if (Get-Command py -ErrorAction SilentlyContinue) {
            Write-Host "Creating .venv (py -3)..."
            py -3 -m venv .venv
        } elseif (Get-Command python -ErrorAction SilentlyContinue) {
            Write-Host "Creating .venv (python)..."
            python -m venv .venv
        } elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
            Write-Host "Creating .venv (python3)..."
            python3 -m venv .venv
        } else {
            Write-Host "Python 3.11+ not in PATH. Install from https://www.python.org/downloads/" -ForegroundColor Red
            Write-Host "Then re-run this script." -ForegroundColor Yellow
            exit 1
        }
        $venvPy = Resolve-VenvPython $BackendDir
    }
    if (-not $venvPy) {
        Write-Host "Missing .venv\Scripts\python.exe - remove .venv folder and retry." -ForegroundColor Red
        exit 1
    }
    Write-Host "Python: $venvPy" -ForegroundColor DarkGray
    & $venvPy @("-m", "pip", "install", "-q", "--upgrade", "pip")
    & $venvPy @("-m", "pip", "install", "-q", "-r", "requirements.txt")
    $check = Join-Path $BackendDir "check_imports.py"
    & $venvPy @($check)
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    return $venvPy
}

if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    Write-Host "npm not found. Install Node.js (https://nodejs.org/) or add it to PATH." -ForegroundColor Red
    exit 1
}

$venvPy = Ensure-BackendVenv $backend

$port = if ($env:PORT) { "$env:PORT".Trim() } else { "8001" }
if (-not $port) { $port = "8001" }

$pyEsc = $venvPy.Replace("'", "''")
$beEsc = $backend.Replace("'", "''")
$apiCmd = "Set-Location '$beEsc'; & '$pyEsc' -m uvicorn server:app --reload --host 127.0.0.1 --port $port"

Write-Host "Starting API in a new window (close that window to stop API)..." -ForegroundColor Cyan
$p = Start-Process -FilePath "powershell.exe" -ArgumentList @("-NoExit", "-NoProfile", "-Command", $apiCmd) -PassThru

Write-Host "Waiting for http://127.0.0.1:$port/health ..." -ForegroundColor Cyan
$ok = $false
for ($i = 0; $i -lt 60; $i++) {
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:$port/health" -UseBasicParsing -TimeoutSec 2
        if ($r.StatusCode -eq 200) {
            Write-Host $r.Content -ForegroundColor DarkGreen
            $ok = $true
            break
        }
    } catch { }
    Start-Sleep -Seconds 1
}
if (-not $ok) {
    Write-Host "API did not start. Close the API window if it opened, fix errors, retry." -ForegroundColor Red
    if ($p -and -not $p.HasExited) { Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue }
    exit 1
}

Set-Location $admin
if (-not (Test-Path "node_modules")) {
    Write-Host "npm install (admin)..." -ForegroundColor Green
    & npm.cmd install --no-audit --no-fund
}

Write-Host "Admin: http://127.0.0.1:5173  (login admin, password = ADMIN_TOKEN in backend/.env)" -ForegroundColor Green
Write-Host "Stop API: close the other PowerShell window running uvicorn." -ForegroundColor DarkGray

try {
    & npm.cmd run dev
} finally {
    if ($p -and -not $p.HasExited) {
        Write-Host "Stopping API process..." -ForegroundColor Yellow
        Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
    }
}
