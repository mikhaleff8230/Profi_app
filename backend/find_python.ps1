# Lists python.exe candidates (no venv, no install). Use when "python" is not in PATH.
# From backend:  .\find_python.ps1
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$candidates = New-Object System.Collections.Generic.List[string]

function Add-Candidate([string]$p) {
    if ([string]::IsNullOrWhiteSpace($p)) { return }
    $p = $p.Trim()
    if ($p -notmatch "\.exe$") { return }
    if ($p -match "WindowsApps") { return }
    if (-not (Test-Path -LiteralPath $p)) { return }
    if ($script:candidates -contains $p) { return }
    [void]$script:candidates.Add($p)
}

foreach ($envName in @("PROFFI_PYTHON", "PYTHON_EXE")) {
    foreach ($scope in @("Process", "User", "Machine")) {
        $raw = [Environment]::GetEnvironmentVariable($envName, $scope)
        if ($raw) { Add-Candidate $raw.Trim() }
    }
}

$regBases = @(
    "HKLM:\SOFTWARE\Python\PythonCore",
    "HKCU:\SOFTWARE\Python\PythonCore",
    "HKLM:\SOFTWARE\WOW6432Node\Python\PythonCore"
)
foreach ($base in $regBases) {
    if (-not (Test-Path $base)) { continue }
    foreach ($verKey in Get-ChildItem $base -ErrorAction SilentlyContinue) {
        $ip = Join-Path $base "$($verKey.PSChildName)\InstallPath"
        if (-not (Test-Path $ip)) { continue }
        $dir = (Get-ItemProperty -LiteralPath $ip -ErrorAction SilentlyContinue)."(default)"
        if ($dir) { Add-Candidate (Join-Path $dir.TrimEnd("\") "python.exe") }
    }
}

foreach ($cmdName in @("python", "python3", "py")) {
    $g = Get-Command $cmdName -ErrorAction SilentlyContinue
    if ($g -and $g.Source -match "\.exe$") { Add-Candidate $g.Source }
    try {
        $raw = & cmd.exe /c "where $cmdName 2>nul"
        if ($LASTEXITCODE -eq 0 -and $raw) {
            foreach ($line in ($raw -split "`r?`n")) { Add-Candidate $line.Trim() }
        }
    } catch { }
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
        Add-Candidate (Join-Path (Join-Path $base $tag) "python.exe")
    }
}

$extras = @(
    (Join-Path $env:USERPROFILE "anaconda3\python.exe"),
    (Join-Path $env:USERPROFILE "miniconda3\python.exe"),
    (Join-Path $env:USERPROFILE "scoop\apps\python\current\python.exe")
)
foreach ($e in $extras) { Add-Candidate $e }

$pyenvRoot = Join-Path $env:USERPROFILE ".pyenv\pyenv-win\versions"
if (Test-Path -LiteralPath $pyenvRoot) {
    Get-ChildItem -Path $pyenvRoot -Directory -ErrorAction SilentlyContinue | ForEach-Object {
        Add-Candidate (Join-Path $_.FullName "python.exe")
    }
}

$rootPy = Join-Path $env:LOCALAPPDATA "Programs\Python"
if (Test-Path -LiteralPath $rootPy) {
    Get-ChildItem -Path $rootPy -Filter "python.exe" -Recurse -Depth 6 -ErrorAction SilentlyContinue |
        ForEach-Object { Add-Candidate $_.FullName }
}

Write-Host "Found $($candidates.Count) candidate(s):" -ForegroundColor Green
foreach ($p in $candidates) { Write-Host "  $p" }

if ($candidates.Count -eq 0) {
    Write-Host ""
    Write-Host "No python.exe found. Install Python from https://www.python.org/downloads/" -ForegroundColor Red
    Write-Host "Enable checkbox 'Add python.exe to PATH', then open a NEW terminal and run .\run_mvp.ps1" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Then run MVP backend:" -ForegroundColor Yellow
Write-Host ('  $env:PROFFI_PYTHON = "' + $candidates[0] + '"') -ForegroundColor Cyan
Write-Host "  .\run_mvp.ps1" -ForegroundColor Cyan
exit 0
