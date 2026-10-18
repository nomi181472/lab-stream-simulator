@echo off
title StreamLab IP Camera Simulator
echo =========================================================================
echo StreamLab - Multi-Protocol IP Camera Simulator ^& Interoperability Lab
echo =========================================================================
echo.
echo Starting FastAPI Backend (with MediaMTX ^& WS-Discovery)...
start "StreamLab Backend (:8000)" cmd /k "backend\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000"

echo Starting Next.js Web Frontend (:3000)...
where npm >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    start "StreamLab Web UI (:3000)" cmd /k "cd frontend && npm run dev"
) else (
    start "StreamLab Web UI (:3000)" cmd /k "wsl -e bash -c \"cd /mnt/c/projects/lab-stream-simulator/frontend && npm run dev\""
)

REM Detect dynamic IPv4 address from active interface
for /f "tokens=4" %%a in ('route print 0.0.0.0 ^| findstr 0.0.0.0 ^| findstr /v "Default"') do (
    set LOCAL_IP=%%a
    goto :ip_found
)
set LOCAL_IP=127.0.0.1
:ip_found

echo.
echo =========================================================================
echo StreamLab is launching!
echo   Local Dashboard:   http://localhost:3000
echo   Network Dashboard: http://%LOCAL_IP%:3000
echo   FastAPI ^& Docs:    http://%LOCAL_IP%:8000/docs
echo   ONVIF SOAP:        http://%LOCAL_IP%:8000/onvif/device_service
echo   RTSP Stream:       rtsp://%LOCAL_IP%:8554/cameras/^<id^>/main
echo   RTMP Stream:       rtmp://%LOCAL_IP%:1935/cameras/^<id^>/main
echo =========================================================================
pause
