#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

echo "========================================================================="
echo "StreamLab - Multi-Protocol IP Camera Simulator & Interoperability Lab"
echo "========================================================================="

cleanup() {
  echo ""
  echo "Shutting down StreamLab processes..."
  kill $(jobs -p) 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM EXIT

echo "[1/2] Starting FastAPI Backend on :8000..."
if [ -f "backend/.venv/bin/python" ]; then
  backend/.venv/bin/python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 &
else
  python3 -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 &
fi
BACKEND_PID=$!

echo "[2/2] Starting Next.js Web Frontend on :3000..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "========================================================================="
echo "StreamLab running in background:"
echo "  Web Dashboard:   http://localhost:3000"
echo "  API & Swagger:   http://localhost:8000/docs"
echo "  ONVIF SOAP:      http://localhost:8000/onvif/device_service"
echo "  RTSP Endpoint:   rtsp://localhost:8554/cameras/101/main"
echo "  RTMP Endpoint:   rtmp://localhost:1935/cameras/101/main"
echo "  WebSocket:       ws://localhost:8000/ws/cameras"
echo "========================================================================="
echo "Press Ctrl+C to stop all services."

wait
