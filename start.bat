@echo off
title StreamLab - Virtual IP Camera Simulator (Native)
echo =========================================================================
echo  StreamLab - Native Windows Launcher
echo =========================================================================
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0scripts\start-all.ps1"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [INFO] Alternatively, you can run StreamLab with Docker Compose:
    echo        Double-click docker-start.bat
    echo.
    pause
)
