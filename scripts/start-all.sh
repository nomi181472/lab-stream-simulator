#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

echo "========================================================================="
echo "StreamLab - Multi-Protocol IP Camera Simulator & Interoperability Lab"
echo "========================================================================="

# 1. Environment / Node.js PATH setup (for Windows Git Bash, WSL, and Linux)
if [ -d "$HOME/.nvm" ] && [ -s "$HOME/.nvm/nvm.sh" ]; then
  export NVM_DIR="$HOME/.nvm"
  # shellcheck source=/dev/null
  \. "$NVM_DIR/nvm.sh" 2>/dev/null || true
fi

if [ -n "$APPDATA" ] && [ -d "$APPDATA/nvm" ]; then
  export NVM_HOME="$APPDATA/nvm"
  export NVM_SYMLINK="$APPDATA/nvm/nodejs"
  export PATH="$NVM_HOME:$NVM_SYMLINK:$PATH"
fi

if ! command -v npm &> /dev/null; then
  for node_path in "/c/Program Files/nodejs" "/c/Program Files (x86)/nodejs" "$LOCALAPPDATA/Programs/node"; do
    if [ -d "$node_path" ]; then
      export PATH="$node_path:$PATH"
      break
    fi
  done
fi

# 2. Detect Python Executable (supports Windows Git Bash, Linux venv, and system Python)
PYTHON_CMD=""
if [ -f "backend/.venv/Scripts/python.exe" ]; then
  PYTHON_CMD="backend/.venv/Scripts/python.exe"
elif [ -f "backend/.venv/Scripts/python" ]; then
  PYTHON_CMD="backend/.venv/Scripts/python"
elif [ -f "backend/.venv/bin/python" ]; then
  PYTHON_CMD="backend/.venv/bin/python"
elif [ -f ".venv/Scripts/python.exe" ]; then
  PYTHON_CMD=".venv/Scripts/python.exe"
elif [ -f ".venv/bin/python" ]; then
  PYTHON_CMD=".venv/bin/python"
elif command -v python &> /dev/null && python -c "import sys" &> /dev/null; then
  PYTHON_CMD="python"
elif command -v python3 &> /dev/null && python3 -c "import sys" &> /dev/null; then
  PYTHON_CMD="python3"
elif command -v py &> /dev/null && py -3 -c "import sys" &> /dev/null; then
  PYTHON_CMD="py -3"
else
  echo "[ERROR] Python 3.12+ not found. Please install Python or set up backend/.venv."
  exit 1
fi

# 3. Graceful cleanup handler
cleanup() {
  trap - SIGINT SIGTERM EXIT
  echo ""
  echo "Shutting down StreamLab processes..."
  [ -n "$BACKEND_PID" ] && kill "$BACKEND_PID" 2>/dev/null || true
  [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null || true
  kill $(jobs -p) 2>/dev/null || true
  if command -v taskkill &>/dev/null; then
    [ -n "$BACKEND_PID" ] && taskkill //F //T //PID "$BACKEND_PID" 2>/dev/null || true
    [ -n "$FRONTEND_PID" ] && taskkill //F //T //PID "$FRONTEND_PID" 2>/dev/null || true
  fi
  exit 0
}
trap cleanup SIGINT SIGTERM EXIT

echo "[1/2] Starting FastAPI Backend on :8000 using $PYTHON_CMD..."
$PYTHON_CMD -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Brief pause to let backend initialize before launching frontend
sleep 2

echo "[2/2] Starting Next.js Web Frontend on :3000..."
(
  cd frontend
  npm run dev
) &
FRONTEND_PID=$!

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

wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || wait
