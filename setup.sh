#!/bin/bash
set -eo pipefail

# Pi LLaMA Setup Script
# Automated installation for Raspberry Pi

VERSION="1.0.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LLAMA_DIR="$HOME/llama.cpp"
MODEL_NAME="qwen2.5-0.5b-instruct-q4_0.gguf"
MODEL_URL="https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/$MODEL_NAME"
LOG_FILE="/tmp/pi-llama-setup.log"
ASSUME_YES=false

# Setup logging
rm -f "$LOG_FILE"
exec > >(tee -a "$LOG_FILE") 2>&1

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info() { echo -e "${YELLOW}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

usage() {
    cat << EOF
Pi LLaMA Setup Script v$VERSION

Usage: ./setup.sh [options]

Options:
  -y, --yes     Assume yes to all prompts (non-interactive)
  -h, --help    Show this help message

Logs are written to: $LOG_FILE
EOF
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -y|--yes) ASSUME_YES=true; shift ;;
        -h|--help) usage; exit 0 ;;
        *) echo "Unknown option: $1"; usage; exit 1 ;;
    esac
done

confirm() {
    if $ASSUME_YES; then return 0; fi
    read -p "$1 [y/N] " response
    [[ "$response" =~ ^[Yy]$ ]]
}

check_internet() {
    info "Checking internet connectivity..."
    if ! wget -q --spider https://huggingface.co 2>/dev/null; then
        error "No internet connection to huggingface.co"
    fi
    success "Internet OK"
}

detect_arch() {
    ARCH=$(uname -m)
    case $ARCH in
        armv7l) PI_MODEL="Pi 3/4 (32-bit)" ;;
        aarch64) PI_MODEL="Pi 4/5 (64-bit)" ;;
        x86_64) PI_MODEL="x86_64" ;;
        *) PI_MODEL="Unknown ($ARCH)" ;;
    esac
    info "Architecture: $PI_MODEL"
}

# Pre-flight checks
if [ "$EUID" -eq 0 ]; then
    error "Do not run as root. Run as regular user with sudo access."
fi

if ! sudo -v; then
    error "Need sudo access to continue."
fi

echo "================================"
echo "  Pi LLaMA Setup v$VERSION"
echo "  User: $USER"
echo "  Home: $HOME"
echo "================================"
echo

detect_arch
check_internet
echo

# Step 1: System optimization
if confirm "Remove unnecessary packages (triggerhappy, logrotate)?"; then
    info "Removing packages..."
    sudo apt remove --purge -y triggerhappy logrotate 2>/dev/null || true
    sudo apt autoremove -y
    success "Packages removed"
else
    info "Skipping package removal"
fi
echo

# Step 2: Install dependencies
info "Installing dependencies..."
sudo apt update
sudo apt install -y git g++ wget build-essential cmake nginx fcgiwrap nodejs npm
success "Dependencies installed"
echo

# Step 3: Clone and build llama.cpp
if [ -d "$LLAMA_DIR" ]; then
    info "llama.cpp already exists at $LLAMA_DIR"
    if confirm "Rebuild llama.cpp?"; then
        cd "$LLAMA_DIR"
        rm -rf build
    else
        info "Skipping build"
    fi
else
    info "Cloning llama.cpp..."
    git clone https://github.com/ggerganov/llama.cpp.git "$LLAMA_DIR"
fi

if [ ! -f "$LLAMA_DIR/build/bin/llama-server" ] || confirm "Build llama.cpp now?"; then
    info "Building llama.cpp (this takes a while on Pi)..."
    cd "$LLAMA_DIR"
    mkdir -p build && cd build
    cmake ..
    cmake --build . --config Release -j2
    success "llama.cpp built"
fi
echo

# Step 4: Download model
mkdir -p "$LLAMA_DIR/models"
if [ -f "$LLAMA_DIR/models/$MODEL_NAME" ]; then
    success "Model already exists"
else
    if confirm "Download model $MODEL_NAME (~400MB)?"; then
        info "Downloading model..."
        wget -O "$LLAMA_DIR/models/$MODEL_NAME" "$MODEL_URL"
        success "Model downloaded"
    else
        info "Skipping model download"
    fi
fi
echo

# Step 5: Install systemd service
info "Installing systemd service..."
sudo tee /etc/systemd/system/llama.service > /dev/null << EOF
[Unit]
Description=LLaMA Server
After=network.target

[Service]
Type=simple
User=$USER
ExecStart=$LLAMA_DIR/build/bin/llama-server -m $LLAMA_DIR/models/$MODEL_NAME --host 0.0.0.0 --port 8080
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable llama
sudo systemctl restart llama
success "llama service installed and started"
echo

# Step 6: Build and deploy React app
info "Building React chat app..."
cd "$SCRIPT_DIR/client"
if [ ! -d "node_modules" ]; then
    npm install
fi
npm run build
cd "$SCRIPT_DIR"
success "React app built"

info "Setting up nginx..."
sudo rm -rf /var/www/chat
sudo ln -sf "$SCRIPT_DIR/client/.output/public" /var/www/chat
success "Linked chat app"

# Setup CGI for shutdown
info "Setting up shutdown CGI..."
sudo mkdir -p /var/www/cgi-bin
if [ -f "$SCRIPT_DIR/shutdown.cgi" ]; then
    sudo cp "$SCRIPT_DIR/shutdown.cgi" /var/www/cgi-bin/
    sudo chmod +x /var/www/cgi-bin/shutdown.cgi
    sudo chown www-data:www-data /var/www/cgi-bin/shutdown.cgi
    success "Copied shutdown.cgi"
else
    info "shutdown.cgi not found, skipping"
fi

# Allow www-data to run shutdown without password
echo "www-data ALL=(ALL) NOPASSWD: /sbin/shutdown" | sudo tee /etc/sudoers.d/shutdown > /dev/null
sudo chmod 440 /etc/sudoers.d/shutdown
success "Sudoers configured for shutdown"

sudo tee /etc/nginx/sites-available/chat > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;

    root /var/www/chat;
    index index.html;

    location / {
        try_files $uri $uri/index.html /index.html;
    }

    location /v1/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /health {
        proxy_pass http://127.0.0.1:8080;
    }

    location /cgi-bin/ {
        gzip off;
        root /var/www;
        fastcgi_pass unix:/var/run/fcgiwrap.socket;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME /var/www$fastcgi_script_name;
    }
}
EOF

sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/chat /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
success "nginx configured"
echo

# Verify services
info "Verifying services..."
sleep 2

if systemctl is-active --quiet llama; then
    success "llama service running"
else
    error "llama service failed to start. Check: journalctl -u llama -xe"
fi

if systemctl is-active --quiet nginx; then
    success "nginx service running"
else
    error "nginx service failed to start. Check: journalctl -u nginx -xe"
fi

# Save version
echo "$VERSION" > "$SCRIPT_DIR/.pi-llama-version"

# Done
echo
echo "================================"
echo -e "${GREEN}Setup complete!${NC}"
echo "================================"
echo
echo "Access the chat at:"
echo "  http://$(hostname).local"
echo "  http://$(hostname -I | awk '{print $1}')"
echo
echo "Useful commands:"
echo "  sudo systemctl status llama"
echo "  journalctl -u llama -f"
echo
echo "Log file: $LOG_FILE"
echo
