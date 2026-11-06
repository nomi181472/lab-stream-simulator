#!/usr/bin/env bash
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

# Ensure execution permissions for standalone binary and internal tools
if [ -f "$DIR/StreamLab" ]; then
    chmod +x "$DIR/StreamLab" 2>/dev/null || true
fi

if [ -d "$DIR/bin" ]; then
    chmod +x "$DIR/bin"/* 2>/dev/null || true
fi

exec "$DIR/StreamLab" "$@"
