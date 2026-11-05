@echo off
setlocal enabledelayedexpansion

echo =========================================================================
echo  StreamLab - Windows .EXE Installer Builder
echo =========================================================================
echo.

cd /d "%~dp0"

:: 1. Ensure Python Virtual Environment exists
if not exist "backend\.venv\Scripts\python.exe" (
    echo [ERROR] Virtual environment backend\.venv\Scripts\python.exe not found!
    echo Please set up backend\.venv first.
    pause
    exit /b 1
)

:: 2. Ensure PyInstaller and Pystray are installed
echo [1/4] Checking Python build dependencies...
.\backend\.venv\Scripts\python.exe -m pip install --quiet pyinstaller pystray pillow
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install PyInstaller / Pystray dependencies.
    pause
    exit /b 1
)

:: 3. Build Next.js Static Frontend
echo [2/4] Building Next.js Static Frontend UI (Mission Control)...
set NEXT_EXPORT=true
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
echo [3/4] Compiling StreamLab backend into standalone executable...
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

:: 5. Compile Inno Setup Installer
echo [4/4] Creating Windows Setup .EXE Installer...

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
    echo.
    echo To package it into a single StreamLab-Setup-1.0.0.exe installer:
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
echo [SUCCESS] Windows Installer created successfully!
echo Location: dist-installer\StreamLab-Setup-1.0.0.exe
echo =========================================================================
echo.
pause
