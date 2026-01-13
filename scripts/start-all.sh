#!/bin/bash
# Start both llama-server and memory-api for Pi-LLaMA
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

info()    { echo -e "${YELLOW}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }

# Cleanup function
cleanup() {
    info "Shutting down..."
    if [ -n "$MEMORY_PID" ] && kill -0 "$MEMORY_PID" 2>/dev/null; then
        kill "$MEMORY_PID" 2>/dev/null
        success "Memory API stopped"
    fi
}
trap cleanup EXIT

# Start memory-api in background
info "Starting memory-api on port 4000..."
cd "$PROJECT_ROOT/memory-api"
./venv/bin/python main.py &
MEMORY_PID=$!

# Wait for memory-api to be ready
sleep 2
if curl -s http://localhost:4000/ > /dev/null 2>&1; then
    success "Memory API ready"
else
    info "Memory API starting (may take a moment)..."
fi

# Start llama-server (foreground)
info "Starting llama-server..."
cd "$PROJECT_ROOT"
exec ./scripts/server.sh
