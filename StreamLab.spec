# -*- mode: python ; coding: utf-8 -*-
import sys
from pathlib import Path

block_cipher = None
PROJECT_ROOT = Path('.').resolve()

datas = [
    ('config', 'config'),
    ('streamlab.ico', '.'),
]

if (PROJECT_ROOT / 'bin').is_dir():
    datas.append(('bin', 'bin'))

# Videos are excluded from standalone bundles to minimize package size.
# Users can upload videos via Mission Control or place them in the videos/ directory.

if (PROJECT_ROOT / 'frontend' / 'out').is_dir():
    datas.append(('frontend/out', 'frontend/out'))

hiddenimports = [
    'uvicorn',
    'uvicorn.logging',
    'uvicorn.loops',
    'uvicorn.loops.auto',
    'uvicorn.protocols',
    'uvicorn.protocols.http',
    'uvicorn.protocols.http.auto',
    'uvicorn.protocols.websockets',
    'uvicorn.protocols.websockets.auto',
    'uvicorn.lifespan',
    'uvicorn.lifespan.on',
    'aiosqlite',
    'sqlalchemy.dialects.sqlite',
    'sqlalchemy.dialects.sqlite.aiosqlite',
    'pystray',
    'PIL',
    'PIL.Image',
    'PIL.ImageDraw',
    'email_validator',
]

if sys.platform == 'win32':
    hiddenimports.append('pystray._win32')
elif sys.platform.startswith('linux'):
    hiddenimports.extend([
        'pystray._xorg',
        'pystray._appindicator',
        'pystray._dummy',
    ])
elif sys.platform == 'darwin':
    hiddenimports.append('pystray._darwin')

a = Analysis(
    ['backend/app/desktop_tray.py'],
    pathex=[str(PROJECT_ROOT)],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['tkinter', 'matplotlib', 'numpy', 'scipy'],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='StreamLab',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=True,  # Set to True for debugging / logging terminal
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='streamlab.ico',
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name='StreamLab',
)
