# MVP (main.py) for Expo: port 8000. Uses .venv-mvp + requirements-mvp.txt (no Mongo stack).
# From backend folder:  .\run_mvp.ps1
#
# If Python is not in PATH, set full path to python.exe:
#   $env:PROFFI_PYTHON = "C:\Users\YOU\AppData\Local\Programs\Python\Python312\python.exe"
#   .\run_mvp.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

function Resolve-MvpVenvPython {
    foreach ($name in @("python.exe", "Python.exe")) {
        $p = Join-Path $PSScriptRoot (Join-Path ".venv-mvp\Scripts" $name)
        if (Test-Path -LiteralPath $p) { return (Resolve-Path -LiteralPath $p).ProviderPath }
    }
    return $null
}

function Find-PythonFromRegistry {
    $bases = @(
        "HKLM:\SOFTWARE\Python\PythonCore",
        "HKCU:\SOFTWARE\Python\PythonCore",
        "HKLM:\SOFTWARE\WOW6432Node\Python\PythonCore"
    )
    foreach ($base in $bases) {
        if (-not (Test-Path $base)) { continue }
        foreach ($verKey in Get-ChildItem $base -ErrorAction SilentlyContinue) {
            $name = $verKey.PSChildName
            $installPathKey = Join-Path $base "$name\InstallPath"
            if (-not (Test-Path $installPathKey)) { continue }
            try {
                $dir = (Get-ItemProperty -LiteralPath $installPathKey -ErrorAction SilentlyContinue)."(default)"
                if ([string]::IsNullOrWhiteSpace($dir)) { continue }
                $exe = Join-Path $dir.TrimEnd("\") "python.exe"
                if (Test-Path -LiteralPath $exe) {
                    return @{ Launcher = $false; Path = (Resolve-Path -LiteralPath $exe).ProviderPath }
                }
            } catch { }
        }
    }
    return $null
}

function Find-PythonFromWhere {
    foreach ($cmdName in @("python", "python3")) {
        try {
            $cmd = Get-Command $cmdName -ErrorAction SilentlyContinue
            if ($cmd -and $cmd.Source -match "\.(exe|EXE)$" -and ($cmd.Source -notmatch "WindowsApps")) {
                return @{ Launcher = $false; Path = $cmd.Source }
            }
        } catch { }
        try {
            $raw = & cmd.exe /c "where $cmdName 2>nul"
            if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($raw)) { continue }
            foreach ($line in ($raw -split "`r?`n")) {
                $line = [string]$line.Trim()
                if (-not $line) { continue }
                if ($line -match "\.exe$" -and ($line -notmatch "WindowsApps") -and (Test-Path -LiteralPath $line)) {
                    return @{ Launcher = $false; Path = $line }
                }
            }
        } catch { }
    }
    return $null
}

function Find-SystemPython {
    foreach ($envName in @("PROFFI_PYTHON", "PYTHON_EXE")) {
        $raw = [Environment]::GetEnvironmentVariable($envName, "Process")
        if (-not $raw) { $raw = [Environment]::GetEnvironmentVariable($envName, "User") }
        if (-not $raw) { $raw = [Environment]::GetEnvironmentVariable($envName, "Machine") }
        if ($raw -and (Test-Path -LiteralPath $raw.Trim())) {
            return @{ Launcher = $false; Path = $raw.Trim() }
        }
    }

    $reg = Find-PythonFromRegistry
    if ($reg) { return $reg }

    $w = Find-PythonFromWhere
    if ($w) { return $w }

    $condaPaths = @(
        (Join-Path $env:USERPROFILE "anaconda3\python.exe"),
        (Join-Path $env:USERPROFILE "miniconda3\python.exe"),
        (Join-Path $env:USERPROFILE "scoop\apps\python\current\python.exe"),
        (Join-Path $env:USERPROFILE "scoop\shims\python.exe")
    )
    if ($env:CONDA_PREFIX) {
        $condaPaths += (Join-Path $env:CONDA_PREFIX "python.exe")
    }
    foreach ($cp in $condaPaths) {
        if ($cp -and (Test-Path -LiteralPath $cp)) {
            return @{ Launcher = $false; Path = (Resolve-Path -LiteralPath $cp).ProviderPath }
        }
    }

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
            if (Test-Path -LiteralPath $candidate) {
                return @{ Launcher = $false; Path = (Resolve-Path -LiteralPath $candidate).ProviderPath }
            }
        }
    }

    $pyenvRoot = Join-Path $env:USERPROFILE ".pyenv\pyenv-win\versions"
    if (Test-Path -LiteralPath $pyenvRoot) {
        $pv = Get-ChildItem -Path $pyenvRoot -Directory -ErrorAction SilentlyContinue |
            Sort-Object Name -Descending |
            Select-Object -First 5
        foreach ($d in $pv) {
            $candidate = Join-Path $d.FullName "python.exe"
            if (Test-Path -LiteralPath $candidate) {
                return @{ Launcher = $false; Path = (Resolve-Path -LiteralPath $candidate).ProviderPath }
            }
        }
    }

    $searchRoots = @(
        "$env:LOCALAPPDATA\Programs\Python",
        "${env:ProgramFiles}\Python314",
        "${env:ProgramFiles}\Python313",
        "${env:ProgramFiles}\Python312",
        "${env:ProgramFiles}\Python311",
        "${env:ProgramFiles}\Python310",
        "${env:ProgramFiles(x86)}\Python312-32",
        "C:\Python314",
        "C:\Python313",
        "C:\Python312",
        "C:\Python311"
    )
    foreach ($root in $searchRoots) {
        if (-not (Test-Path $root)) { continue }
        $direct = Join-Path $root "python.exe"
        if (Test-Path -LiteralPath $direct) {
            return @{ Launcher = $false; Path = (Resolve-Path -LiteralPath $direct).ProviderPath }
        }
        $found = Get-ChildItem -Path $root -Filter "python.exe" -Recurse -Depth 5 -ErrorAction SilentlyContinue |
            Where-Object { $_.FullName -notmatch "\\WindowsApps\\" } |
            Select-Object -First 1
        if ($found) {
            return @{ Launcher = $false; Path = $found.FullName }
        }
    }
    foreach ($cmd in @("python", "python3", "py")) {
        $g = Get-Command $cmd -ErrorAction SilentlyContinue
        if ($g -and $g.Source -match "\.(exe|EXE)$") {
            if ($g.Source -match "WindowsApps") { continue }
            if ($cmd -eq "py") {
                return @{ Launcher = $true; Path = $g.Source }
            }
            return @{ Launcher = $false; Path = $g.Source }
        }
    }
    return $null
}

$venvPy = Resolve-MvpVenvPython
if (-not $venvPy) {
    $sys = Find-SystemPython
    if ($null -eq $sys) {
        Write-Host "Python not found." -ForegroundColor Red
        Write-Host "If you typed 'python' in the console and got an error, use this script instead (it finds Python without PATH):" -ForegroundColor Yellow
        Write-Host "   .\run_mvp.ps1" -ForegroundColor Cyan
        Write-Host "Or list candidates:   .\find_python.ps1" -ForegroundColor Cyan
        Write-Host "1) Install from https://www.python.org/downloads/ and enable 'Add python.exe to PATH'" -ForegroundColor Yellow
        Write-Host "2) Or set full path, then run again:" -ForegroundColor Yellow
        Write-Host '   $env:PROFFI_PYTHON = "C:\Users\YOU\AppData\Local\Programs\Python\Python312\python.exe"' -ForegroundColor Cyan
        exit 1
    }
    if ($sys.Launcher) {
        Write-Host "Creating .venv-mvp (py -3)..."
        & $sys.Path "-3" "-m" "venv" ".venv-mvp"
    } else {
        Write-Host "Creating .venv-mvp using: $($sys.Path)"
        & $sys.Path "-m" "venv" ".venv-mvp"
    }
    $venvPy = Resolve-MvpVenvPython
    if (-not $venvPy) {
        Write-Host "venv failed. Remove folder .venv-mvp and retry." -ForegroundColor Red
        exit 1
    }
}

$mvpReq = Join-Path $PSScriptRoot "requirements-mvp.txt"
if (-not (Test-Path $mvpReq)) {
    Write-Host "Missing requirements-mvp.txt" -ForegroundColor Red
    exit 1
}

& $venvPy @("-m", "pip", "install", "-q", "--upgrade", "pip")
& $venvPy @("-m", "pip", "install", "-q", "-r", "requirements-mvp.txt")
& $venvPy @(Join-Path $PSScriptRoot "check_mvp.py")
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "http://127.0.0.1:8000/docs" -ForegroundColor Green
& $venvPy @("-m", "uvicorn", "main:app", "--reload", "--host", "0.0.0.0", "--port", "8000")
