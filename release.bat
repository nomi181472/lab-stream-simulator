@echo off
setlocal
cd /d "%~dp0"

if exist "backend\.venv\Scripts\python.exe" (
    "backend\.venv\Scripts\python.exe" scripts\release.py %*
) else (
    python scripts\release.py %*
)

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Release process encountered an error.
    pause
    exit /b %ERRORLEVEL%
)

echo.
pause
