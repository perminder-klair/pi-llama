#!/bin/bash
set -e

# Pi-LLaMA React Client Build Script

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CLIENT_DIR="$PROJECT_ROOT/client"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info() { echo -e "${YELLOW}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }

if [ ! -d "$CLIENT_DIR" ]; then
    echo "Error: Client directory not found: $CLIENT_DIR"
    exit 1
fi

info "Building React chat app..."
cd "$CLIENT_DIR"

if [ ! -d "node_modules" ]; then
    info "Installing dependencies..."
    npm install
fi

npm run build

success "Build complete!"
echo "Output: $CLIENT_DIR/.output/public/"
