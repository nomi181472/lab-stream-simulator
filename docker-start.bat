@echo off
title StreamLab - Virtual IP Camera Simulator (Docker)
echo =========================================================================
echo  StreamLab - Multi-Protocol IP Camera Simulator (Docker)
echo =========================================================================
echo.

where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker CLI not found. Please ensure Docker Desktop is installed.
    echo Download: https://www.docker.com/products/docker-desktop/
    pause
    exit /b 1
)

echo Starting StreamLab containers in background...
docker compose up -d
if %ERRORLEVEL% EQU 0 (
    echo.
    echo =========================================================================
    echo  StreamLab is LIVE!
    echo   - Mission Control UI:  http://localhost:3000
    echo   - REST / ONVIF API:    http://localhost:8000/docs
    echo   - RTSP Stream:         rtsp://localhost:8554/cameras/101/main
    echo   - RTMP Stream:         rtmp://localhost:1935/cameras/101/main
    echo =========================================================================
    echo.
    echo Launching Mission Control in your browser...
    start http://localhost:3000
) else (
    echo.
    echo [ERROR] Failed to start Docker containers.
    echo Make sure Docker Desktop is started and running.
)
echo.
pause
