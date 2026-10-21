#!/usr/bin/env bash
set -e

echo "========================================================================="
echo " StreamLab - Multi-Protocol IP Camera Simulator (Docker)"
echo "========================================================================="
echo ""

if ! command -v docker &> /dev/null; then
    echo "[ERROR] Docker is not installed or not in PATH."
    echo "Please install Docker: https://docs.docker.com/engine/install/"
    exit 1
fi

echo "Starting StreamLab containers in background..."
docker compose up -d

echo ""
echo "========================================================================="
echo " StreamLab is LIVE!"
echo "  - Mission Control UI:  http://localhost:3000"
echo "  - REST / ONVIF API:    http://localhost:8000/docs"
echo "  - RTSP Stream:         rtsp://localhost:8554/cameras/101/main"
echo "  - RTMP Stream:         rtmp://localhost:1935/cameras/101/main"
echo "========================================================================="
echo ""

# Try opening in browser if available
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3000 2>/dev/null || true
elif command -v open &> /dev/null; then
    open http://localhost:3000 2>/dev/null || true
fi
