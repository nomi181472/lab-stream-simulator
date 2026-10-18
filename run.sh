#!/usr/bin/env bash
# ==============================================================================
# StreamLab — Universal Cross-Platform Launcher
# Runs seamlessly on: Linux, Ubuntu Subsystem for Windows (WSL), and Windows (Git Bash)
# ==============================================================================

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

# ANSI Colors
BOLD="\033[1m"
GREEN="\033[0;32m"
CYAN="\033[0;36m"
YELLOW="\033[0;33m"
MAGENTA="\033[0;35m"
RED="\033[0;31m"
RESET="\033[0m"

echo -e "${CYAN}${BOLD}========================================================================${RESET}"
echo -e "${CYAN}${BOLD} StreamLab — Multi-Protocol IP Camera Simulator & Interoperability Lab  ${RESET}"
echo -e "${CYAN}${BOLD}========================================================================${RESET}"

# 1. Detect Environment
OS_TYPE="$(uname -s)"
IS_WSL=false
IS_WINDOWS=false

if [[ -f /proc/version ]] && grep -qi microsoft /proc/version; then
    IS_WSL=true
    PLATFORM="Ubuntu / Linux Subsystem (WSL)"
elif [[ "$OS_TYPE" =~ MINGW|MSYS|CYGWIN ]]; then
    IS_WINDOWS=true
    PLATFORM="Windows (Git Bash / MSYS)"
else
    PLATFORM="Linux Native"
fi

echo -e "Platform Environment: ${GREEN}${BOLD}${PLATFORM}${RESET}"

# 2. Setup Node.js / NVM path if needed
if [ -d "$HOME/.nvm" ] && [ -s "$HOME/.nvm/nvm.sh" ]; then
    export NVM_DIR="$HOME/.nvm"
    # shellcheck source=/dev/null
    \. "$NVM_DIR/nvm.sh" 2>/dev/null || true
fi

if [ "$IS_WINDOWS" = true ] && [ -d "$APPDATA/nvm" ]; then
    export NVM_HOME="$APPDATA/nvm"
    export NVM_SYMLINK="$APPDATA/nvm/nodejs"
    export PATH="$NVM_HOME:$NVM_SYMLINK:$PATH"
fi

# Verify Node & npm
if ! command -v node &> /dev/null; then
    echo -e "${RED}Warning: node is not found in PATH.${RESET}"
    echo -e "Run ${YELLOW}./scripts/setup-node-nvm.sh${RESET} first to install Node.js & npm."
fi

# 3. Detect Python Executable
PYTHON_CMD=""
if [ -f "backend/.venv/Scripts/python.exe" ]; then
    PYTHON_CMD="backend/.venv/Scripts/python.exe"
elif [ -f "backend/.venv/bin/python" ]; then
    PYTHON_CMD="backend/.venv/bin/python"
elif command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    echo -e "${RED}Error: Python 3.12+ not found. Please install Python or set up backend/.venv.${RESET}"
    exit 1
fi

echo -e "Python Interpreter:   ${MAGENTA}${PYTHON_CMD}${RESET}"
if command -v node &> /dev/null; then
    echo -e "Node.js Engine:       ${MAGENTA}$(node -v)${RESET} (npm $(npm -v))"
fi
echo ""

# 4. Graceful Cleanup Handler
cleanup() {
    echo ""
    echo -e "${YELLOW}>> Gracefully shutting down StreamLab services...${RESET}"
    # Kill all child jobs started by this script
    kill $(jobs -p) 2>/dev/null || true
    # On Windows/WSL, also ensure any orphaned uvicorn process is stopped
    wait 2>/dev/null || true
    echo -e "${GREEN}✓ All services stopped.${RESET}"
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# 5. Launch FastAPI Backend + MediaMTX + WS-Discovery
echo -e "${CYAN}>> [1/2] Starting StreamLab FastAPI Core & Media Engine on :8000...${RESET}"
$PYTHON_CMD -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait briefly for backend to initialize
sleep 2

# 6. Launch Next.js Frontend
echo -e "${CYAN}>> [2/2] Starting Next.js Web Frontend on :3000...${RESET}"
(
    cd frontend
    # If production build exists and npm run start works, use start or dev
    if [ -d ".next" ]; then
        npm run start -- -p 3000
    else
        npm run dev
    fi
) &
FRONTEND_PID=$!

echo ""
echo -e "${GREEN}${BOLD}========================================================================${RESET}"
echo -e "${GREEN}${BOLD} StreamLab is ONLINE and ready!                                        ${RESET}"
echo -e "${GREEN}${BOLD}========================================================================${RESET}"
echo -e "  ${BOLD}Web Mission Control:${RESET}   ${CYAN}http://localhost:3000${RESET}"
echo -e "  ${BOLD}FastAPI & Docs:${RESET}        ${CYAN}http://localhost:8000/docs${RESET}"
echo -e "  ${BOLD}ONVIF SOAP Service:${RESET}    ${CYAN}http://localhost:8000/onvif/device_service${RESET}"
echo -e "  ${BOLD}WS-Discovery Daemon:${RESET}   ${CYAN}239.255.255.250:3702 UDP${RESET}"
echo -e "  ${BOLD}RTSP Live Stream:${RESET}      ${CYAN}rtsp://localhost:8554/cameras/101/main${RESET}"
echo -e "  ${BOLD}RTMP Live Stream:${RESET}      ${CYAN}rtmp://localhost:1935/cameras/101/main${RESET}"
echo -e "  ${BOLD}HLS Browser Stream:${RESET}    ${CYAN}http://localhost:8888/cameras/101/main/index.m3u8${RESET}"
echo -e "  ${BOLD}WebSocket Telemetry:${RESET}   ${CYAN}ws://localhost:8000/ws/cameras${RESET}"
echo -e "${GREEN}${BOLD}========================================================================${RESET}"
echo -e "${YELLOW}Press [Ctrl + C] anytime to stop all StreamLab services.${RESET}\n"

# Keep script running and waiting for background processes
wait
