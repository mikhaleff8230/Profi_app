# Run Proffi backend locally (SQLite + uvicorn).
# From backend folder:  .\run_local.ps1
# Default port 8001 (same as admin/vite proxy).

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env from .env.example - edit JWT_SECRET and CORS_ORIGINS if needed." -ForegroundColor Yellow
}

function Resolve-VenvPython {
    $candidates = @(
        (Join-Path $PSScriptRoot ".venv\Scripts\python.exe"),
        (Join-Path $PSScriptRoot ".venv\Scripts\Python.exe")
    )
    foreach ($p in $candidates) {
        if (Test-Path -LiteralPath $p) {
            return (Resolve-Path -LiteralPath $p).ProviderPath
        }
    }
    return $null
}

$venvPy = Resolve-VenvPython
if (-not $venvPy) {
    if (Get-Command py -ErrorAction SilentlyContinue) {
        Write-Host "Creating .venv (py -3) ..."
        py -3 -m venv .venv
    } elseif (Get-Command python -ErrorAction SilentlyContinue) {
        Write-Host "Creating .venv (python) ..."
        python -m venv .venv
    } elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
        Write-Host "Creating .venv (python3) ..."
        python3 -m venv .venv
    } else {
        Write-Host "Python not in PATH. Install Python 3.11+ from https://www.python.org/downloads/" -ForegroundColor Red
        Write-Host "  winget install Python.Python.3.12" -ForegroundColor Cyan
        exit 1
    }
    $venvPy = Resolve-VenvPython
}

if (-not $venvPy) {
    Write-Host "Missing: .venv\Scripts\python.exe after venv create." -ForegroundColor Red
    Write-Host "Remove folder .venv here and run this script again." -ForegroundColor Yellow
    exit 1
}

Write-Host "Python: $venvPy" -ForegroundColor DarkGray

& $venvPy @("-m", "pip", "install", "-q", "--upgrade", "pip")
& $venvPy @("-m", "pip", "install", "-q", "-r", "requirements.txt")

$checkScript = Join-Path $PSScriptRoot "check_imports.py"
& $venvPy @($checkScript)
if ($LASTEXITCODE -ne 0) {
    Write-Host "check_imports.py failed - see errors above." -ForegroundColor Red
    exit $LASTEXITCODE
}

$port = if ($env:PORT) { "$env:PORT".Trim() } else { "8001" }
if (-not $port) { $port = "8001" }

$base = "http://127.0.0.1:" + $port
Write-Host "API $base  |  Swagger $base/docs" -ForegroundColor Green
& $venvPy @(
    "-m", "uvicorn",
    "server:app",
    "--reload",
    "--host", "127.0.0.1",
    "--port", $port
)
