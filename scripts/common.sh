#!/bin/bash
# Common functions sourced by all Pi-LLaMA scripts

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()    { echo -e "${YELLOW}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Confirmation prompt (respects ASSUME_YES)
confirm() {
    if [ "${ASSUME_YES:-false}" = "true" ]; then return 0; fi
    read -p "$1 [y/N] " response
    [[ "$response" =~ ^[Yy]$ ]]
}

# Load configuration from pi-llama.conf
load_config() {
    echo "[load_config] Starting..."
    local config_file="$PROJECT_ROOT/pi-llama.conf"
    echo "[load_config] Config file: $config_file"

    if [ ! -f "$config_file" ]; then
        echo -e "${RED}[ERROR]${NC} Config file not found: $config_file"
        echo
        echo "Create one by copying a preset:"
        echo "  cp configs/pi-llama.conf.pi pi-llama.conf      # For Raspberry Pi"
        echo "  cp configs/pi-llama.conf.desktop pi-llama.conf # For Desktop"
        exit 1
    fi

    echo "[load_config] Sourcing config file..."
    # shellcheck source=/dev/null
    source "$config_file"
    echo "[load_config] Config sourced."

    # Set defaults for empty values
    echo "[load_config] Setting defaults..."
    LLAMA_DIR="${LLAMA_DIR:-$HOME/llama.cpp}"
    MODEL_DIR="${MODEL_DIR:-$LLAMA_DIR/models}"
    CLIENT_OUTPUT_DIR="${CLIENT_OUTPUT_DIR:-$PROJECT_ROOT/client/.output/public}"

    # Validate required settings
    echo "[load_config] Validating..."
    [ -z "$ENVIRONMENT" ] && error "ENVIRONMENT not set in config"
    [ -z "$MODEL_NAME" ] && error "MODEL_NAME not set in config"
    [ -z "$SERVER_PORT" ] && error "SERVER_PORT not set in config"
    echo "[load_config] Done."
}

# Detect system capabilities
detect_system() {
    ARCH=$(uname -m)
    OS_ID=$(grep -E "^ID=" /etc/os-release 2>/dev/null | cut -d= -f2 | tr -d '"')

    case $ARCH in
        armv7l|aarch64) IS_ARM=true ;;
        x86_64) IS_ARM=false ;;
        *) IS_ARM=false ;;
    esac

    # Auto-detect package manager if not set
    if [ -z "$PACKAGE_MANAGER" ]; then
        if command -v apt &>/dev/null; then
            PACKAGE_MANAGER="apt"
        elif command -v pacman &>/dev/null; then
            PACKAGE_MANAGER="pacman"
        elif command -v dnf &>/dev/null; then
            PACKAGE_MANAGER="dnf"
        fi
    fi

    # Get RAM in GB
    RAM_GB=$(free -g 2>/dev/null | awk '/^Mem:/{print $2}' || echo "0")

    # Get free disk space in GB
    DISK_FREE=$(df -BG "$HOME" 2>/dev/null | awk 'NR==2{gsub("G","",$4); print $4}' || echo "0")
}

# Check internet connectivity
check_internet() {
    info "Checking internet connectivity..."
    if ! wget -q --spider https://huggingface.co 2>/dev/null; then
        error "No internet connection to huggingface.co"
    fi
    success "Internet OK"
}
