#!/usr/bin/env bash
# ==============================================================================
# StreamLab - Linux Executable & Package Builder
# Builds:
#   1. Standalone Linux ELF executable (dist/StreamLab)
#   2. Portable Archive (dist-installer/StreamLab-Linux-<version>-x86_64.tar.gz)
#   3. Portable Zip (dist-installer/StreamLab-Portable-Linux.zip)
#   4. Direct Debian/Ubuntu Installer (dist-installer/StreamLab-Linux-<version>-amd64.deb)
# ==============================================================================

set -e

export PATH="$HOME/.local/bin:$PATH"

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

VERSION="$(cat VERSION 2>/dev/null || echo "1.0.0")"
VERSION="$(echo "$VERSION" | tr -d '[:space:]')"

echo "========================================================================="
echo " StreamLab - Linux Executable & Installer Builder (v${VERSION})"
echo "========================================================================="
echo

# 1. Determine Python Command
PYTHON_CMD="python3"
if [ -f "backend/.venv/bin/python" ]; then
    PYTHON_CMD="backend/.venv/bin/python"
elif [ -f "backend/.venv/bin/python3" ]; then
    PYTHON_CMD="backend/.venv/bin/python3"
elif ! command -v python3 >/dev/null 2>&1; then
    echo "[ERROR] python3 not found. Please install Python 3.10+."
    exit 1
fi

echo "[1/5] Checking Python build dependencies with $PYTHON_CMD..."
PIP_FLAGS="--quiet"
if $PYTHON_CMD -m pip help install 2>&1 | grep -q -- "--break-system-packages"; then
    PIP_FLAGS="--quiet --break-system-packages"
fi

$PYTHON_CMD -m pip install $PIP_FLAGS --upgrade pip setuptools wheel
$PYTHON_CMD -m pip install $PIP_FLAGS pyinstaller pystray pillow email-validator
if [ -f "backend/requirements.txt" ]; then
    $PYTHON_CMD -m pip install $PIP_FLAGS -r backend/requirements.txt
fi

# 2. Ensure Linux MediaMTX binary is present in bin/
echo "[2/5] Checking Linux MediaMTX binary..."
mkdir -p bin
if [ ! -f "bin/mediamtx" ] || file "bin/mediamtx" | grep -q "PE32"; then
    echo "Downloading MediaMTX for Linux x86_64..."
    MTX_TAR="mediamtx_v1.21.0_linux_amd64.tar.gz"
    MTX_URL="https://github.com/bluenviron/mediamtx/releases/download/v1.21.0/${MTX_TAR}"
    if command -v curl >/dev/null 2>&1; then
        curl -sSL -o "$MTX_TAR" "$MTX_URL"
    elif command -v wget >/dev/null 2>&1; then
        wget -q -O "$MTX_TAR" "$MTX_URL"
    fi
    tar -xzf "$MTX_TAR" -C bin mediamtx
    rm -f "$MTX_TAR"
fi
chmod +x bin/mediamtx 2>/dev/null || true

# 3. Build Next.js Static Frontend UI
echo "[3/5] Building Next.js Static Frontend UI (Mission Control)..."
export NEXT_EXPORT="true"
export NEXT_TELEMETRY_DISABLED="1"
cd frontend
if [ ! -d "node_modules" ]; then
    npm install --no-audit
fi
npm run build
cd ..

if [ ! -f "frontend/out/index.html" ]; then
    echo "[ERROR] Next.js static export failed! frontend/out/index.html missing."
    exit 1
fi

# 4. Run PyInstaller
echo "[4/5] Compiling StreamLab backend into standalone Linux executable..."
$PYTHON_CMD -m PyInstaller --noconfirm StreamLab.spec

# Ensure auxiliary directories exist in dist/StreamLab
mkdir -p dist/StreamLab/videos dist/StreamLab/bin dist/StreamLab/config dist/StreamLab/frontend/out
echo "Place your video files (.mp4, .mkv, .avi, etc.) here or upload them via Mission Control." > dist/StreamLab/videos/README.txt
if [ -d "config" ]; then cp -r config/* dist/StreamLab/config/; fi
cp -r frontend/out/* dist/StreamLab/frontend/out/

# Copy Linux mediamtx and configs into dist/StreamLab/bin
if [ -f "bin/mediamtx" ]; then
    cp bin/mediamtx dist/StreamLab/bin/
    chmod +x dist/StreamLab/bin/mediamtx
fi
if [ -f "bin/mediamtx.yml" ]; then
    cp bin/mediamtx.yml dist/StreamLab/bin/
fi

# Copy runner script and icon
cp "installer/linux/streamlab.sh" "dist/StreamLab/streamlab.sh"
chmod +x "dist/StreamLab/streamlab.sh"
chmod +x "dist/StreamLab/StreamLab"

if [ -f "installer/linux/streamlab.png" ]; then
    cp "installer/linux/streamlab.png" "dist/StreamLab/streamlab.png"
fi

# 5. Create Distribution Packages
echo "[5/5] Creating Linux distribution packages in dist-installer/..."
mkdir -p dist-installer

# A. Portable .tar.gz (Universal for all Linux distros)
TAR_NAME="StreamLab-Linux-${VERSION}-x86_64.tar.gz"
echo "Creating portable tarball: dist-installer/$TAR_NAME..."
tar -czf "dist-installer/$TAR_NAME" -C dist StreamLab
cp -f "dist-installer/$TAR_NAME" "dist-installer/StreamLab-Linux-x86_64.tar.gz"

# B. Portable .zip
if command -v zip >/dev/null 2>&1; then
    echo "Creating portable zip: dist-installer/StreamLab-Portable-Linux.zip..."
    (cd dist && zip -rq "../dist-installer/StreamLab-Portable-Linux.zip" StreamLab)
fi

# C. Debian / Ubuntu .deb package
if command -v dpkg-deb >/dev/null 2>&1; then
    bash installer/linux/build-deb.sh
else
    echo "[NOTICE] dpkg-deb not installed; skipping .deb creation."
fi

echo
echo "========================================================================="
echo " [SUCCESS] Linux Packages Built Successfully!"
echo "   Portable Tarball: dist-installer/$TAR_NAME"
if [ -f "dist-installer/StreamLab-Linux-${VERSION}-amd64.deb" ]; then
    echo "   Debian Installer: dist-installer/StreamLab-Linux-${VERSION}-amd64.deb"
fi
echo "========================================================================="
