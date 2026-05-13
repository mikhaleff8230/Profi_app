@echo off
cd /d "%~dp0"
echo Starting MVP backend (creates .venv-mvp if needed)...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run_mvp.ps1"
if errorlevel 1 pause
