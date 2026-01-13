#!/bin/bash
# Pi-LLaMA Development Mode - Start all services
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()    { echo -e "${YELLOW}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Track PIDs for cleanup
MEMORY_PID=""
LLAMA_PID=""

cleanup() {
    echo
    info "Shutting down dev services..."

    if [ -n "$LLAMA_PID" ] && kill -0 "$LLAMA_PID" 2>/dev/null; then
        kill "$LLAMA_PID" 2>/dev/null
        success "llama-server stopped"
    fi

    if [ -n "$MEMORY_PID" ] && kill -0 "$MEMORY_PID" 2>/dev/null; then
        kill "$MEMORY_PID" 2>/dev/null
        success "Memory API stopped"
    fi

    success "All services stopped"
}
trap cleanup EXIT

echo -e "${CYAN}================================${NC}"
echo -e "${CYAN}  Pi-LLaMA Development Mode${NC}"
echo -e "${CYAN}================================${NC}"
echo

# Start memory-api on port 4000
info "Starting memory-api on port 4000..."
cd "$PROJECT_ROOT/memory-api"

# Create venv if it doesn't exist
if [ ! -d "venv" ]; then
    info "Creating Python virtual environment for memory-api..."
    python3 -m venv venv
    ./venv/bin/pip install --upgrade pip
    ./venv/bin/pip install -r requirements.txt
    success "Virtual environment created and dependencies installed"
fi

./venv/bin/python main.py &
MEMORY_PID=$!
cd "$PROJECT_ROOT"

# Wait for memory-api to be ready
sleep 2
if curl -s http://localhost:4000/ > /dev/null 2>&1; then
    success "Memory API ready at http://localhost:4000"
else
    info "Memory API starting (may take a moment)..."
fi

# Start llama-server in background
info "Starting llama-server on port 5000..."
source "$SCRIPT_DIR/common.sh"
load_config
detect_system

MODEL_PATH="$MODEL_DIR/$MODEL_NAME"
SERVER_BIN="$LLAMA_DIR/build/bin/llama-server"

if [ ! -f "$MODEL_PATH" ]; then
    error "Model not found: $MODEL_PATH\nRun: ./scripts/setup.sh"
fi

if [ ! -f "$SERVER_BIN" ]; then
    error "llama-server not found: $SERVER_BIN\nRun: ./scripts/setup.sh"
fi

# Build llama-server command
CMD="$SERVER_BIN"
CMD+=" -m $MODEL_PATH"
CMD+=" --host ${SERVER_HOST:-0.0.0.0}"
CMD+=" --port ${SERVER_PORT:-5000}"
CMD+=" -c ${CONTEXT_SIZE:-2048}"

[ "${GPU_LAYERS:-0}" -gt 0 ] && CMD+=" -ngl $GPU_LAYERS"
[ "${CPU_THREADS:-0}" -gt 0 ] && CMD+=" -t $CPU_THREADS"
[ "${ENABLE_TOOL_CALLING:-false}" = "true" ] && CMD+=" --jinja"
[ "${ENABLE_EMBEDDING:-false}" = "true" ] && CMD+=" --embedding"

$CMD &
LLAMA_PID=$!

# Wait for llama-server to be ready
sleep 3
if curl -s http://localhost:${SERVER_PORT:-5000}/health > /dev/null 2>&1; then
    success "llama-server ready at http://localhost:${SERVER_PORT:-5000}"
else
    info "llama-server starting (model loading may take a moment)..."
fi

echo
echo -e "${GREEN}Dev services running:${NC}"
echo "  - Memory API:    http://localhost:4000"
echo "  - llama-server:  http://localhost:${SERVER_PORT:-5000}"
echo "  - React (Vite):  http://localhost:3000"
echo
info "Starting React dev server with hot reload..."
echo "Press Ctrl+C to stop all services"
echo

# Start Vite dev server in foreground
cd "$PROJECT_ROOT/client"
exec npm run dev
