#!/usr/bin/env bash
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

PYTHON_CMD="python"
if [ -f "backend/.venv/Scripts/python.exe" ]; then
    PYTHON_CMD="backend/.venv/Scripts/python.exe"
elif [ -f "backend/.venv/bin/python" ]; then
    PYTHON_CMD="backend/.venv/bin/python"
elif command -v python3 &>/dev/null && python3 -c "import sys" &>/dev/null; then
    PYTHON_CMD="python3"
fi

"$PYTHON_CMD" scripts/release.py "$@"
