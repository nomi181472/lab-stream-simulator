# StreamLab - PowerShell All-in-One Launcher
Write-Host "=========================================================================" -ForegroundColor Cyan
Write-Host " StreamLab - Multi-Protocol IP Camera Simulator & Interoperability Lab " -ForegroundColor Green
Write-Host "=========================================================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

Write-Host "[1/2] Starting FastAPI Backend on port 8000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot'; .\backend\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000"

Write-Host "[2/2] Starting Next.js Web UI on port 3000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot\frontend'; npm run dev"

Write-Host ""
Write-Host "=========================================================================" -ForegroundColor Cyan
Write-Host "StreamLab instances launched successfully in dedicated windows!" -ForegroundColor Green
Write-Host "  Web Dashboard:   http://localhost:3000" -ForegroundColor White
Write-Host "  API & Swagger:   http://localhost:8000/docs" -ForegroundColor White
Write-Host "  ONVIF SOAP:      http://localhost:8000/onvif/device_service" -ForegroundColor White
Write-Host "  RTSP Endpoint:   rtsp://localhost:8554/cameras/101/main" -ForegroundColor White
Write-Host "  RTMP Endpoint:   rtmp://localhost:1935/cameras/101/main" -ForegroundColor White
Write-Host "  WebSocket:       ws://localhost:8000/ws/cameras" -ForegroundColor White
Write-Host "=========================================================================" -ForegroundColor Cyan
