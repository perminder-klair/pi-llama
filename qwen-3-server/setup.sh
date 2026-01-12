#!/bin/bash
set -e

# Qwen3-30B-A3B Setup Script
# For Arch Linux with 24GB+ RAM

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LLAMA_DIR="$HOME/llama.cpp"
MODEL_NAME="Qwen3-30B-A3B-Q4_K_M.gguf"
MODEL_URL="https://huggingface.co/unsloth/Qwen3-30B-A3B-GGUF/resolve/main/$MODEL_NAME"
MODEL_SIZE="18.6GB"
SERVER_PORT=5000

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info() { echo -e "${YELLOW}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

confirm() {
    read -p "$1 [y/N] " response
    [[ "$response" =~ ^[Yy]$ ]]
}

# Pre-flight checks
if [ "$EUID" -eq 0 ]; then
    error "Do not run as root. Run as regular user with sudo access."
fi

if ! sudo -v; then
    error "Need sudo access to continue."
fi

# Check RAM
RAM_GB=$(free -g | awk '/^Mem:/{print $2}')
if [ "$RAM_GB" -lt 20 ]; then
    error "Need at least 20GB RAM. You have ${RAM_GB}GB."
fi

# Check disk space
DISK_FREE=$(df -BG "$HOME" | awk 'NR==2{gsub("G","",$4); print $4}')
if [ "$DISK_FREE" -lt 25 ]; then
    error "Need at least 25GB free disk space. You have ${DISK_FREE}GB."
fi

echo "================================"
echo "  Qwen3-30B-A3B Setup"
echo "  User: $USER"
echo "  Home: $HOME"
echo "  RAM: ${RAM_GB}GB"
echo "  Free disk: ${DISK_FREE}GB"
echo "================================"
echo

# Step 1: Install dependencies
info "Installing dependencies..."
sudo pacman -S --needed --noconfirm base-devel cmake ninja
success "Dependencies installed"
echo

# Step 2: Clone and build llama.cpp
if [ -d "$LLAMA_DIR" ]; then
    info "llama.cpp already exists at $LLAMA_DIR"
    if confirm "Rebuild llama.cpp?"; then
        cd "$LLAMA_DIR"
        rm -rf build
    fi
else
    info "Cloning llama.cpp..."
    git clone https://github.com/ggerganov/llama.cpp.git "$LLAMA_DIR"
fi

if [ ! -f "$LLAMA_DIR/build/bin/llama-server" ]; then
    info "Building llama.cpp..."
    cd "$LLAMA_DIR"
    mkdir -p build && cd build
    cmake .. -G Ninja
    ninja
    success "llama.cpp built"
else
    success "llama-server already built"
fi
echo

# Step 3: Download model
mkdir -p "$LLAMA_DIR/models"
if [ -f "$LLAMA_DIR/models/$MODEL_NAME" ]; then
    success "Model already exists"
else
    echo
    info "Model: $MODEL_NAME"
    info "Size: $MODEL_SIZE"
    info "This will take a while to download..."
    echo
    if confirm "Download model (~$MODEL_SIZE)?"; then
        info "Downloading model..."
        wget --continue --show-progress -O "$LLAMA_DIR/models/$MODEL_NAME" "$MODEL_URL"
        success "Model downloaded"
    else
        info "Skipping model download"
    fi
fi
echo

# Done
echo "================================"
echo -e "${GREEN}Setup complete!${NC}"
echo "================================"
echo
echo "Start the server with:"
echo "  ./run-server.sh"
echo
echo "Then access the chat at:"
echo "  http://localhost:$SERVER_PORT"
echo
