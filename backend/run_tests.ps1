# Установка зависимостей, подъём API (uvicorn) и pytest. Совместимо с Windows PowerShell 5.1 (без &&).
# Из папки backend:  powershell -ExecutionPolicy Bypass -File .\run_tests.ps1
# Порт: $env:PORT или 8001. Если python не в PATH: $env:PROFFI_PYTHON = "C:\...\python.exe"

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "Created .env from .env.example" -ForegroundColor Yellow
    }
}

function Resolve-VenvPython {
    foreach ($name in @("python.exe", "Python.exe")) {
        $p = Join-Path $PSScriptRoot (Join-Path ".venv\Scripts" $name)
        if (Test-Path -LiteralPath $p) { return (Resolve-Path -LiteralPath $p).ProviderPath }
    }
    return $null
}

function Find-SystemPythonPath {
    $pyTags = @("Python314", "Python313", "Python312", "Python311", "Python310", "Python39", "Python38")
    $pyBases = @(
        (Join-Path $env:LOCALAPPDATA "Programs\Python"),
        $env:ProgramFiles,
        ${env:ProgramFiles(x86)}
    )
    foreach ($base in $pyBases) {
        if (-not $base -or -not (Test-Path -LiteralPath $base)) { continue }
        foreach ($tag in $pyTags) {
            $candidate = Join-Path (Join-Path $base $tag) "python.exe"
            if (Test-Path -LiteralPath $candidate) { return (Resolve-Path -LiteralPath $candidate).ProviderPath }
        }
    }
    $searchRoots = @(
        "C:\Python314", "C:\Python313", "C:\Python312", "C:\Python311"
    )
    foreach ($root in $searchRoots) {
        $direct = Join-Path $root "python.exe"
        if (Test-Path -LiteralPath $direct) { return (Resolve-Path -LiteralPath $direct).ProviderPath }
    }
    return $null
}

$venvPy = Resolve-VenvPython
if (-not $venvPy) {
    $pp = if ($env:PROFFI_PYTHON) { $env:PROFFI_PYTHON.Trim() } else { "" }
    if ($pp -and (Test-Path -LiteralPath $pp)) {
        Write-Host "Creating .venv using PROFFI_PYTHON..." -ForegroundColor Cyan
        & $pp @("-m", "venv", ".venv")
    } elseif (Get-Command py -ErrorAction SilentlyContinue) {
        Write-Host "Creating .venv (py -3)..." -ForegroundColor Cyan
        py -3 -m venv .venv
    } elseif (Get-Command python -ErrorAction SilentlyContinue) {
        Write-Host "Creating .venv (python)..." -ForegroundColor Cyan
        python -m venv .venv
    } elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
        Write-Host "Creating .venv (python3)..." -ForegroundColor Cyan
        python3 -m venv .venv
    } else {
        $sysPy = Find-SystemPythonPath
        if ($sysPy) {
            Write-Host "Creating .venv using: $sysPy" -ForegroundColor Cyan
            & $sysPy @("-m", "venv", ".venv")
        } else {
            Write-Host "Python not found. Set PROFFI_PYTHON to python.exe or run .\find_python.ps1" -ForegroundColor Red
            exit 1
        }
    }
    $venvPy = Resolve-VenvPython
}

if (-not $venvPy) {
    Write-Host "Missing .venv\Scripts\python.exe after venv create." -ForegroundColor Red
    exit 1
}

Write-Host "Python: $venvPy" -ForegroundColor DarkGray
& $venvPy @("-m", "pip", "install", "-q", "--upgrade", "pip")
& $venvPy @("-m", "pip", "install", "-q", "-r", "requirements.txt")
& $venvPy @("-m", "pip", "install", "-q", "pytest", "requests")

$port = if ($env:PORT) { "$env:PORT".Trim() } else { "8001" }
if (-not $port) { $port = "8001" }
$base = "http://127.0.0.1:" + $port

Write-Host "Starting API on $base ..." -ForegroundColor Cyan
$proc = Start-Process -FilePath $venvPy -ArgumentList @(
    "-m", "uvicorn", "server:app", "--host", "127.0.0.1", "--port", $port
) -WorkingDirectory $PWD.Path -PassThru -WindowStyle Hidden

$code = 1
try {
    $ready = $false
    for ($i = 0; $i -lt 60; $i++) {
        if ($proc.HasExited) {
            Write-Host "uvicorn exited early (code $($proc.ExitCode))." -ForegroundColor Red
            exit 1
        }
        try {
            $r = Invoke-WebRequest -Uri ($base + "/health") -UseBasicParsing -TimeoutSec 2
            if ($r.StatusCode -eq 200) {
                $ready = $true
                break
            }
        } catch { }
        Start-Sleep -Seconds 1
    }
    if (-not $ready) {
        Write-Host "API did not respond on $base" -ForegroundColor Red
        exit 1
    }

    $env:REACT_APP_BACKEND_URL = $base
    Write-Host "pytest (REACT_APP_BACKEND_URL=$env:REACT_APP_BACKEND_URL)..." -ForegroundColor Green
    & $venvPy @("-m", "pytest", "tests/backend_test.py", "-q", "--tb=short")
    $code = $LASTEXITCODE
} finally {
    if ($proc -and -not $proc.HasExited) {
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    }
}

exit $code
