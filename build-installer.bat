@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

set "VERSION=1.0.0"
if exist "VERSION" (
    set /p VERSION=<VERSION
)
set "VERSION=%VERSION: =%"

echo =========================================================================
echo  StreamLab - Windows .EXE Installer & Portable Package Builder (v%VERSION%)
echo =========================================================================
echo.

:: 1. Ensure Python Virtual Environment exists
if not exist "backend\.venv\Scripts\python.exe" (
    echo [ERROR] Virtual environment backend\.venv\Scripts\python.exe not found!
    echo Please set up backend\.venv first.
    pause
    exit /b 1
)

:: 2. Ensure PyInstaller and Pystray are installed
echo [1/5] Checking Python build dependencies...
.\backend\.venv\Scripts\python.exe -m pip install --quiet pyinstaller pystray pillow email-validator
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install PyInstaller / Pystray dependencies.
    pause
    exit /b 1
)

:: 3. Build Next.js Static Frontend
echo [2/5] Building Next.js Static Frontend UI (Mission Control)...
set NEXT_EXPORT=true
set NEXT_TELEMETRY_DISABLED=1
cd frontend
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Next.js build failed.
    cd ..
    pause
    exit /b 1
)
cd ..

:: 4. Run PyInstaller to build standalone distribution
echo [3/5] Compiling StreamLab backend into standalone executable...
.\backend\.venv\Scripts\pyinstaller.exe --noconfirm StreamLab.spec
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] PyInstaller compilation failed.
    pause
    exit /b 1
)

:: Ensure directories exist in dist\StreamLab
if not exist "dist\StreamLab\videos" (
    echo Copying videos into dist...
    xcopy /E /I /Y "videos" "dist\StreamLab\videos"
)
if not exist "dist\StreamLab\bin" (
    echo Copying bin into dist...
    xcopy /E /I /Y "bin" "dist\StreamLab\bin"
)
if not exist "dist\StreamLab\config" (
    echo Copying config into dist...
    xcopy /E /I /Y "config" "dist\StreamLab\config"
)
if not exist "dist\StreamLab\frontend\out" (
    echo Copying frontend build into dist...
    xcopy /E /I /Y "frontend\out" "dist\StreamLab\frontend\out"
)

:: 5. Create Portable ZIP
echo [4/5] Creating Windows Portable ZIP archive...
if not exist "dist-installer" mkdir "dist-installer"
powershell -NoProfile -Command "Compress-Archive -Path 'dist\StreamLab\*' -DestinationPath 'dist-installer\StreamLab-Portable-Windows.zip' -Force"
powershell -NoProfile -Command "Copy-Item -Path 'dist-installer\StreamLab-Portable-Windows.zip' -Destination 'dist-installer\StreamLab-Windows-%VERSION%-x64.zip' -Force"

:: 6. Compile Inno Setup Installer
echo [5/5] Creating Windows Setup .EXE Installer...

set "ISCC="
if exist "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" set "ISCC=C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
if exist "C:\Program Files\Inno Setup 6\ISCC.exe" set "ISCC=C:\Program Files\Inno Setup 6\ISCC.exe"
if exist "%LOCALAPPDATA%\Programs\Inno Setup 6\ISCC.exe" set "ISCC=%LOCALAPPDATA%\Programs\Inno Setup 6\ISCC.exe"

if "%ISCC%"=="" (
    where iscc >nul 2>&1
    if %ERRORLEVEL% EQU 0 set "ISCC=iscc"
)

if "%ISCC%"=="" (
    echo.
    echo =========================================================================
    echo [NOTICE] Inno Setup compiler (ISCC.exe) was not found on your system!
    echo.
    echo The standalone application was successfully compiled into:
    echo    dist\StreamLab\StreamLab.exe
    echo And portable zip created at:
    echo    dist-installer\StreamLab-Portable-Windows.zip
    echo.
    echo To package it into a single StreamLab-Setup-%VERSION%.exe installer:
    echo 1. Install Inno Setup (free) by running:
    echo       winget install JRSoftware.InnoSetup
    echo    Or download from: https://jrsoftware.org/isdl.php
    echo.
    echo 2. Re-run this script, or right-click 'installer\StreamLab.iss'
    echo    and choose 'Compile'.
    echo =========================================================================
    echo.
    pause
    exit /b 0
)

echo Compiling installer using: "%ISCC%"
"%ISCC%" "installer\StreamLab.iss"
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Inno Setup compilation failed.
    pause
    exit /b 1
)

echo.
echo =========================================================================
echo [SUCCESS] Windows Packages created successfully!
echo Setup Installer: dist-installer\StreamLab-Setup-%VERSION%.exe
echo Portable Zip:    dist-installer\StreamLab-Portable-Windows.zip
echo =========================================================================
echo.
pause
