#!/usr/bin/env python3
"""
StreamLab MediaMTX Binary Downloader.
Downloads and extracts the correct platform-specific MediaMTX binary using the GitHub Releases API.
"""

import io
import json
import os
import sys
import tarfile
import urllib.request
import zipfile
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BIN_DIR = PROJECT_ROOT / "bin"


def download_mediamtx(target_platform: str):
    BIN_DIR.mkdir(parents=True, exist_ok=True)
    target_platform = target_platform.lower()

    if target_platform in ("windows", "win", "win32", "win64"):
        asset_pattern = "windows_amd64.zip"
        output_file = BIN_DIR / "mediamtx.exe"
    elif target_platform in ("linux", "linux_amd64"):
        asset_pattern = "linux_amd64.tar.gz"
        output_file = BIN_DIR / "mediamtx"
    else:
        raise ValueError(f"Unsupported platform: {target_platform}")

    print(f"[1/3] Querying latest MediaMTX release for pattern '{asset_pattern}'...")
    req = urllib.request.Request(
        "https://api.github.com/repos/bluenviron/mediamtx/releases/latest",
        headers={"User-Agent": "StreamLab-Release-Automation"}
    )
    with urllib.request.urlopen(req) as resp:
        release = json.loads(resp.read().decode())

    target_asset = None
    for a in release.get("assets", []):
        if asset_pattern in a.get("name", ""):
            target_asset = a
            break

    if not target_asset:
        raise RuntimeError(f"Could not find asset matching '{asset_pattern}' in release {release.get('tag_name')}")

    print(f"[2/3] Downloading asset '{target_asset['name']}' from API endpoint...")
    download_req = urllib.request.Request(
        target_asset["url"],
        headers={
            "User-Agent": "StreamLab-Release-Automation",
            "Accept": "application/octet-stream"
        }
    )

    with urllib.request.urlopen(download_req) as resp:
        raw_bytes = resp.read()

    print(f"[3/3] Extracting MediaMTX binary ({len(raw_bytes)} bytes) into {BIN_DIR}...")
    if asset_pattern.endswith(".zip"):
        with zipfile.ZipFile(io.BytesIO(raw_bytes)) as zf:
            for name in zf.namelist():
                if name.lower() in ("mediamtx.exe", "mediamtx.yml", "license"):
                    data = zf.read(name)
                    dest = BIN_DIR / name
                    dest.write_bytes(data)
                    print(f"  [OK] Extracted {name} ({len(data)} bytes)")
    elif asset_pattern.endswith(".tar.gz"):
        with tarfile.open(fileobj=io.BytesIO(raw_bytes)) as tf:
            for member in tf.getmembers():
                if member.name in ("mediamtx", "mediamtx.yml", "LICENSE"):
                    f = tf.extractfile(member)
                    if f:
                        data = f.read()
                        dest = BIN_DIR / member.name
                        dest.write_bytes(data)
                        if member.name == "mediamtx":
                            dest.chmod(0o755)
                        print(f"  [OK] Extracted {member.name} ({len(data)} bytes)")

    if output_file.exists():
        print(f"[SUCCESS] MediaMTX binary is ready at: {output_file}")
    else:
        raise FileNotFoundError(f"Failed to extract binary to {output_file}")


if __name__ == "__main__":
    plat = sys.argv[1] if len(sys.argv) > 1 else ("windows" if sys.platform == "win32" else "linux")
    download_mediamtx(plat)
