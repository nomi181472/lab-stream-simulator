#!/usr/bin/env bash
# ==============================================================================
# StreamLab — Universal NVM, Node.js & npm Installer / Environment Configurator
# Compatible with: Linux, Ubuntu (WSL / WSL2), and Windows (Git Bash / MSYS2)
# ==============================================================================

set -e

# ANSI Color codes
BOLD="\033[1m"
GREEN="\033[0;32m"
CYAN="\033[0;36m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
RESET="\033[0m"

echo -e "${CYAN}${BOLD}========================================================================${RESET}"
echo -e "${CYAN}${BOLD} StreamLab — Cross-Platform NVM, Node.js & npm Setup Tool              ${RESET}"
echo -e "${CYAN}${BOLD}========================================================================${RESET}"

# 1. Detect Operating System & Environment
OS_TYPE="$(uname -s)"
IS_WSL=false
IS_WINDOWS=false

if [[ -f /proc/version ]] && grep -qi microsoft /proc/version; then
    IS_WSL=true
    PLATFORM_NAME="Ubuntu / Linux Subsystem (WSL)"
elif [[ "$OS_TYPE" =~ MINGW|MSYS|CYGWIN ]]; then
    IS_WINDOWS=true
    PLATFORM_NAME="Windows (Git Bash / MSYS2)"
elif [[ "$OS_TYPE" == "Linux" ]]; then
    PLATFORM_NAME="Native Linux"
elif [[ "$OS_TYPE" == "Darwin" ]]; then
    PLATFORM_NAME="macOS"
else
    PLATFORM_NAME="$OS_TYPE"
fi

echo -e "Detected Platform: ${GREEN}${BOLD}${PLATFORM_NAME}${RESET}\n"

# 2. Linux / WSL Environment Installation
if [ "$IS_WINDOWS" = false ]; then
    echo -e "${YELLOW}>> Checking NVM installation for Linux/WSL...${RESET}"
    
    export NVM_DIR="$HOME/.nvm"
    if [ ! -d "$NVM_DIR" ]; then
        echo -e "Installing official nvm (Node Version Manager)..."
        if command -v curl &> /dev/null; then
            curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
        elif command -v wget &> /dev/null; then
            wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
        else
            echo -e "${RED}Error: Neither curl nor wget found. Please install curl or wget first.${RESET}"
            exit 1
        fi
    else
        echo -e "${GREEN}✓ NVM directory found at: $NVM_DIR${RESET}"
    fi

    # Load NVM into current subshell
    if [ -s "$NVM_DIR/nvm.sh" ]; then
        # shellcheck source=/dev/null
        \. "$NVM_DIR/nvm.sh"
    fi

    if command -v nvm &> /dev/null; then
        echo -e "${GREEN}✓ NVM loaded successfully (version $(nvm --version))${RESET}"
        
        echo -e "\n${YELLOW}>> Installing latest Node.js LTS and npm...${RESET}"
        nvm install --lts
        nvm use --lts
        nvm alias default 'lts/*'
    else
        echo -e "${YELLOW}Notice: nvm function loaded in profile. Checking system node...${RESET}"
    fi

# 3. Windows (Git Bash / MSYS) Environment
else
    echo -e "${YELLOW}>> Setting up Windows Node/NVM Environment...${RESET}"
    
    # Check if NVM for Windows is installed in APPDATA
    WIN_NVM_DIR="$APPDATA/nvm"
    if [ -f "$WIN_NVM_DIR/nvm.exe" ]; then
        export NVM_HOME="$WIN_NVM_DIR"
        export NVM_SYMLINK="$WIN_NVM_DIR/nodejs"
        export PATH="$NVM_HOME:$NVM_SYMLINK:$PATH"
        echo -e "${GREEN}✓ NVM for Windows detected at: $WIN_NVM_DIR${RESET}"
    fi
fi

# 4. Verify Final Node & npm Binaries
echo -e "\n${CYAN}>> Verifying Node.js & npm runtime availability...${RESET}"
if command -v node &> /dev/null; then
    NODE_VER="$(node -v)"
    echo -e "  ${GREEN}✓ Node.js Version:${RESET} ${BOLD}${NODE_VER}${RESET} (at $(command -v node))"
else
    echo -e "  ${RED}✗ Node.js not found in current PATH.${RESET}"
fi

if command -v npm &> /dev/null; then
    NPM_VER="$(npm -v)"
    echo -e "  ${GREEN}✓ npm Version:    ${RESET} ${BOLD}${NPM_VER}${RESET} (at $(command -v npm))"
else
    echo -e "  ${RED}✗ npm not found in current PATH.${RESET}"
fi

echo -e "\n${CYAN}${BOLD}========================================================================${RESET}"
echo -e "${GREEN}${BOLD}Setup completed successfully!${RESET}"
echo -e "You can now run ${BOLD}./run.sh${RESET} or ${BOLD}npm run dev${RESET} inside the frontend folder."
echo -e "${CYAN}${BOLD}========================================================================${RESET}"
