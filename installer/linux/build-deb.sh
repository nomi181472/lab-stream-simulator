#!/usr/bin/env bash
# ==============================================================================
# StreamLab - Linux Debian (.DEB) Package Builder
# Packages dist/StreamLab into dist-installer/StreamLab-Linux-<version>-amd64.deb
# ==============================================================================

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

VERSION="$(cat VERSION 2>/dev/null || echo "1.0.0")"
VERSION="$(echo "$VERSION" | tr -d '[:space:]')"

if [ ! -d "dist/StreamLab" ]; then
    echo "[ERROR] dist/StreamLab directory does not exist! Run PyInstaller build first."
    exit 1
fi

if ! command -v dpkg-deb >/dev/null 2>&1; then
    echo "[ERROR] dpkg-deb tool not found. Please install dpkg (or run on Debian/Ubuntu)."
    exit 1
fi

echo "========================================================================="
echo " Building StreamLab Linux .deb Package (v${VERSION})"
echo "========================================================================="

STAGING="/tmp/streamlab-deb-staging"
rm -rf "$STAGING"
mkdir -p "$STAGING/DEBIAN"
mkdir -p "$STAGING/opt/streamlab"
mkdir -p "$STAGING/usr/share/applications"
mkdir -p "$STAGING/usr/share/icons/hicolor/128x128/apps"
mkdir -p "dist-installer"

# 1. Copy application files into /opt/streamlab
echo "Copying StreamLab distribution files..."
cp -r dist/StreamLab/* "$STAGING/opt/streamlab/"
cp "installer/linux/streamlab.sh" "$STAGING/opt/streamlab/streamlab.sh"
chmod +x "$STAGING/opt/streamlab/streamlab.sh"
chmod +x "$STAGING/opt/streamlab/StreamLab" 2>/dev/null || true
if [ -d "$STAGING/opt/streamlab/bin" ]; then
    chmod +x "$STAGING/opt/streamlab/bin"/* 2>/dev/null || true
fi

# 2. Desktop icon and shortcut
if [ -f "installer/linux/streamlab.png" ]; then
    cp "installer/linux/streamlab.png" "$STAGING/opt/streamlab/streamlab.png"
    cp "installer/linux/streamlab.png" "$STAGING/usr/share/icons/hicolor/128x128/apps/streamlab.png"
fi
cp "installer/linux/streamlab.desktop" "$STAGING/usr/share/applications/streamlab.desktop"

# 3. Control file with synchronized version
sed "s/^Version:.*/Version: ${VERSION}/" "installer/linux/DEBIAN/control" > "$STAGING/DEBIAN/control"

# 4. Maintainer scripts and strict Debian directory permissions
cp "installer/linux/DEBIAN/postinst" "$STAGING/DEBIAN/postinst"
cp "installer/linux/DEBIAN/postrm" "$STAGING/DEBIAN/postrm"
chmod 755 "$STAGING/DEBIAN"
chmod 755 "$STAGING/DEBIAN/postinst" "$STAGING/DEBIAN/postrm"
chmod 644 "$STAGING/DEBIAN/control"

# 5. Build Debian package
DEB_NAME="StreamLab-Linux-${VERSION}-amd64.deb"
OUTPUT_DEB="dist-installer/$DEB_NAME"
echo "Compiling Debian package with dpkg-deb..."
dpkg-deb --build --root-owner-group "$STAGING" "$OUTPUT_DEB"

# Also maintain convenience generic name
cp -f "$OUTPUT_DEB" "dist-installer/StreamLab-Linux-amd64.deb"

# Clean up staging directory
rm -rf "$STAGING"

echo "========================================================================="
echo "[SUCCESS] Linux .deb package created:"
echo "   $OUTPUT_DEB"
echo "   dist-installer/StreamLab-Linux-amd64.deb"
echo "========================================================================="
