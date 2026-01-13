#!/bin/bash
set -eo pipefail

# Pi-LLaMA Unified Setup Script
# Works on both Raspberry Pi (apt) and Desktop (pacman/dnf)

VERSION="2.0.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="/tmp/pi-llama-setup.log"
ASSUME_YES=false
INIT_CONFIG=false

# Pre-flight checks BEFORE logging redirect (so prompts are visible)
echo "Starting Pi-LLaMA setup..."

if [ "$EUID" -eq 0 ]; then
    echo "Error: Do not run as root. Run as regular user with sudo access."
    exit 1
fi

echo "Checking sudo access..."

# Validate sudo access (prompts for password here)
if ! sudo -v; then
    echo "Error: Need sudo access to continue."
    exit 1
fi

echo "Sudo OK. Setting up logging..."

# Setup logging (after sudo prompt)
rm -f "$LOG_FILE" 2>/dev/null || sudo rm -f "$LOG_FILE"

echo "Starting main setup..."

# Source common functions
echo "Loading common.sh..."
source "$SCRIPT_DIR/common.sh"
echo "Common.sh loaded."
echo "Defining functions..."

usage() {
    cat << EOF
Pi-LLaMA Setup Script v$VERSION

Usage: ./scripts/setup.sh [options]

Options:
  --init      Initialize config file interactively
  -y, --yes   Assume yes to all prompts (non-interactive)
  -h, --help  Show this help message

Logs are written to: $LOG_FILE
EOF
}

echo "Parsing arguments..."

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --init) INIT_CONFIG=true; shift ;;
        -y|--yes) ASSUME_YES=true; shift ;;
        -h|--help) usage; exit 0 ;;
        *) echo "Unknown option: $1"; usage; exit 1 ;;
    esac
done

echo "Arguments parsed. Checking config..."

# Interactive config initialization
init_config() {
    detect_system

    echo "Pi-LLaMA Configuration Setup"
    echo "============================="
    echo
    echo "Detected: $ARCH ($OS_ID)"
    echo

    # Suggest preset based on architecture
    if [ "$IS_ARM" = true ]; then
        DEFAULT_PRESET="pi"
    else
        DEFAULT_PRESET="desktop"
    fi

    read -p "Environment [pi/desktop] ($DEFAULT_PRESET): " env_choice
    env_choice="${env_choice:-$DEFAULT_PRESET}"

    if [ "$env_choice" = "pi" ]; then
        cp "$PROJECT_ROOT/configs/pi-llama.conf.pi" "$PROJECT_ROOT/pi-llama.conf"
    else
        cp "$PROJECT_ROOT/configs/pi-llama.conf.desktop" "$PROJECT_ROOT/pi-llama.conf"
    fi

    success "Created pi-llama.conf with $env_choice preset"
    echo
    echo "Edit pi-llama.conf to customize, then run:"
    echo "  ./scripts/setup.sh"
}

echo "Checking for config file..."

# Check for config or init mode
if [ "$INIT_CONFIG" = true ] || [ ! -f "$PROJECT_ROOT/pi-llama.conf" ]; then
    if [ ! -f "$PROJECT_ROOT/pi-llama.conf" ]; then
        echo "No config file found."
        echo
    fi
    init_config
    exit 0
fi

echo "Config file found. Loading config..."

# Load config and detect system
load_config
echo "Config loaded. Detecting system..."
detect_system

echo "================================"
echo "  Pi-LLaMA Setup v$VERSION"
echo "  Environment: $ENVIRONMENT"
echo "  User: $USER"
echo "  Arch: $ARCH"
echo "================================"
echo

check_internet

# Check system requirements for desktop
if [ "$ENVIRONMENT" = "desktop" ]; then
    if [ "$RAM_GB" -lt 20 ]; then
        echo -e "${YELLOW}Warning: Only ${RAM_GB}GB RAM detected. Qwen3-30B needs 20GB+.${NC}"
        if ! confirm "Continue anyway?"; then
            exit 1
        fi
    fi
    if [ "$DISK_FREE" -lt 25 ]; then
        echo -e "${YELLOW}Warning: Only ${DISK_FREE}GB free disk space. Model needs ~20GB.${NC}"
        if ! confirm "Continue anyway?"; then
            exit 1
        fi
    fi
fi

echo

# Step 1: Install dependencies
install_dependencies() {
    info "Installing dependencies..."

    case $PACKAGE_MANAGER in
        apt)
            sudo apt update
            sudo apt install -y git g++ wget build-essential cmake nodejs npm
            if [ "${USE_NGINX:-false}" = "true" ]; then
                sudo apt install -y nginx fcgiwrap
            fi
            ;;
        pacman)
            # Build list of packages to install, skipping those already available
            local pkgs=""
            command -v git &>/dev/null || pkgs+=" git"
            command -v cmake &>/dev/null || pkgs+=" cmake"
            command -v ninja &>/dev/null || pkgs+=" ninja"
            command -v wget &>/dev/null || pkgs+=" wget"
            command -v node &>/dev/null || pkgs+=" nodejs"
            command -v npm &>/dev/null || pkgs+=" npm"
            pacman -Qq base-devel &>/dev/null || pkgs+=" base-devel"

            if [ -n "$pkgs" ]; then
                sudo pacman -S --needed --noconfirm $pkgs
            else
                success "All dependencies already installed"
            fi
            ;;
        dnf)
            sudo dnf install -y git gcc-c++ cmake ninja-build wget nodejs npm
            ;;
        *)
            error "Unsupported package manager: $PACKAGE_MANAGER"
            ;;
    esac

    success "Dependencies installed"
}

# Step 2: Build llama.cpp
build_llama() {
    if [ -d "$LLAMA_DIR" ]; then
        info "llama.cpp already exists at $LLAMA_DIR"
        if [ -f "$LLAMA_DIR/build/bin/llama-server" ]; then
            if ! confirm "Rebuild llama.cpp?"; then
                success "Using existing llama.cpp build"
                return
            fi
        fi
        rm -rf "$LLAMA_DIR/build"
    else
        info "Cloning llama.cpp..."
        git clone https://github.com/ggerganov/llama.cpp.git "$LLAMA_DIR"
    fi

    info "Building llama.cpp..."
    cd "$LLAMA_DIR"
    mkdir -p build && cd build

    # Use ninja on Arch, make on others
    if command -v ninja &>/dev/null && [ "$PACKAGE_MANAGER" = "pacman" ]; then
        cmake .. -G Ninja
        ninja
    else
        cmake ..
        # Use fewer cores on Pi to avoid OOM
        if [ "$IS_ARM" = true ]; then
            cmake --build . --config Release -j2
        else
            cmake --build . --config Release -j$(nproc)
        fi
    fi

    success "llama.cpp built"
}

# Step 3: Download model
download_model() {
    mkdir -p "$MODEL_DIR"

    if [ -f "$MODEL_DIR/$MODEL_NAME" ]; then
        success "Model already exists: $MODEL_NAME"
        return
    fi

    echo
    info "Model: $MODEL_NAME"
    if [ -n "$MODEL_URL" ]; then
        if confirm "Download model from HuggingFace?"; then
            info "Downloading model (this may take a while)..."
            wget --continue --show-progress -O "$MODEL_DIR/$MODEL_NAME" "$MODEL_URL"
            success "Model downloaded"
        else
            info "Skipping model download"
            echo "Download manually to: $MODEL_DIR/$MODEL_NAME"
        fi
    else
        info "No MODEL_URL set. Download model manually to: $MODEL_DIR/$MODEL_NAME"
    fi
}

# Step 4: Build React client
build_client() {
    info "Building React chat app..."
    cd "$PROJECT_ROOT/client"

    if [ ! -d "node_modules" ]; then
        npm install
    fi

    npm run build
    success "React app built"
}

# Step 5: Install systemd service (Pi only)
install_systemd_service() {
    if [ "${USE_SYSTEMD:-false}" != "true" ]; then
        return
    fi

    info "Installing systemd service..."

    # Generate service file from template
    local model_path="$MODEL_DIR/$MODEL_NAME"
    sed -e "s|%USER%|$USER|g" \
        -e "s|%HOME%|$HOME|g" \
        -e "s|%MODEL_PATH%|$model_path|g" \
        -e "s|%PORT%|$SERVER_PORT|g" \
        -e "s|%LLAMA_DIR%|$LLAMA_DIR|g" \
        -e "s|%PROJECT_ROOT%|$PROJECT_ROOT|g" \
        "$PROJECT_ROOT/configs/llama.service.template" | sudo tee /etc/systemd/system/llama.service > /dev/null

    sudo systemctl daemon-reload
    sudo systemctl enable llama
    sudo systemctl restart llama

    success "Systemd service installed and started"
}

# Step 6: Configure nginx (Pi only)
configure_nginx() {
    if [ "${USE_NGINX:-false}" != "true" ]; then
        return
    fi

    info "Configuring nginx..."

    # Link React app to web root
    sudo rm -rf /var/www/chat
    sudo ln -sf "$PROJECT_ROOT/client/.output/public" /var/www/chat

    # Generate nginx config from template
    sed -e "s|%LLAMA_PORT%|$SERVER_PORT|g" \
        -e "s|%NGINX_PORT%|${NGINX_PORT:-80}|g" \
        "$PROJECT_ROOT/configs/nginx-chat.template" | sudo tee /etc/nginx/sites-available/chat > /dev/null

    sudo rm -f /etc/nginx/sites-enabled/default
    sudo ln -sf /etc/nginx/sites-available/chat /etc/nginx/sites-enabled/

    # Setup CGI for shutdown (optional)
    if [ -f "$PROJECT_ROOT/configs/shutdown.cgi" ]; then
        sudo mkdir -p /var/www/cgi-bin
        sudo cp "$PROJECT_ROOT/configs/shutdown.cgi" /var/www/cgi-bin/
        sudo chmod +x /var/www/cgi-bin/shutdown.cgi
        sudo chown www-data:www-data /var/www/cgi-bin/shutdown.cgi

        # Allow www-data to run shutdown without password
        echo "www-data ALL=(ALL) NOPASSWD: /sbin/shutdown" | sudo tee /etc/sudoers.d/shutdown > /dev/null
        sudo chmod 440 /etc/sudoers.d/shutdown
    fi

    sudo nginx -t
    sudo systemctl restart nginx
    sudo systemctl enable nginx

    success "Nginx configured"
}

# Verify services
verify_services() {
    if [ "${USE_SYSTEMD:-false}" = "true" ]; then
        info "Verifying services..."
        sleep 2

        if systemctl is-active --quiet llama; then
            success "llama service running"
        else
            echo -e "${YELLOW}Warning: llama service not running. Check: journalctl -u llama -xe${NC}"
        fi

        if [ "${USE_NGINX:-false}" = "true" ]; then
            if systemctl is-active --quiet nginx; then
                success "nginx service running"
            else
                echo -e "${YELLOW}Warning: nginx service not running. Check: journalctl -u nginx -xe${NC}"
            fi
        fi
    fi
}

# Main execution
main() {
    install_dependencies
    echo

    build_llama
    echo

    download_model
    echo

    build_client
    echo

    if [ "$ENVIRONMENT" = "pi" ]; then
        install_systemd_service
        configure_nginx
        verify_services
    fi

    # Save version
    echo "$VERSION" > "$PROJECT_ROOT/.pi-llama-version"

    # Done
    echo
    echo "================================"
    echo -e "${GREEN}Setup complete!${NC}"
    echo "================================"
    echo

    if [ "${USE_NGINX:-false}" = "true" ]; then
        echo "Access the chat at:"
        echo "  http://$(hostname).local"
        echo "  http://$(hostname -I 2>/dev/null | awk '{print $1}')"
        echo
        echo "Useful commands:"
        echo "  sudo systemctl status llama"
        echo "  journalctl -u llama -f"
    else
        echo "Start the server with:"
        echo "  ./scripts/server.sh"
        echo
        echo "Then access the chat at:"
        echo "  http://localhost:$SERVER_PORT"
    fi

    echo
    echo "Log file: $LOG_FILE"
}

main
