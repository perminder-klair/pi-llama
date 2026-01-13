#!/bin/bash
set -e

# Pi-LLaMA Server Start Script
# Reads configuration from pi-llama.conf

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"
load_config
detect_system

MODEL_PATH="$MODEL_DIR/$MODEL_NAME"
SERVER_BIN="$LLAMA_DIR/build/bin/llama-server"

# Validate binaries and model exist
if [ ! -f "$MODEL_PATH" ]; then
    error "Model not found: $MODEL_PATH\nRun: ./scripts/setup.sh"
fi

if [ ! -f "$SERVER_BIN" ]; then
    error "llama-server not found: $SERVER_BIN\nRun: ./scripts/setup.sh"
fi

# Build command from config
CMD="$SERVER_BIN"
CMD+=" -m $MODEL_PATH"
CMD+=" --host ${SERVER_HOST:-0.0.0.0}"
CMD+=" --port ${SERVER_PORT:-5000}"
CMD+=" -c ${CONTEXT_SIZE:-2048}"

# GPU layers (only if > 0)
if [ "${GPU_LAYERS:-0}" -gt 0 ]; then
    CMD+=" -ngl $GPU_LAYERS"
fi

# CPU threads (only if > 0)
if [ "${CPU_THREADS:-0}" -gt 0 ]; then
    CMD+=" -t $CPU_THREADS"
fi

# Tool calling (Jinja templates)
if [ "${ENABLE_TOOL_CALLING:-false}" = "true" ]; then
    CMD+=" --jinja"
fi

# Embedding support
if [ "${ENABLE_EMBEDDING:-false}" = "true" ]; then
    CMD+=" --embedding"
fi

# Serve static files directly (when not using nginx)
if [ "${USE_NGINX:-true}" = "false" ] && [ -d "$CLIENT_OUTPUT_DIR" ]; then
    CMD+=" --path $CLIENT_OUTPUT_DIR"
fi

# Print startup info
echo "================================"
echo "  Pi-LLaMA Server"
echo "  Environment: $ENVIRONMENT"
echo "================================"
info "Model: $MODEL_NAME"
info "URL: http://${SERVER_HOST}:${SERVER_PORT}"
[ "${GPU_LAYERS:-0}" -gt 0 ] && info "GPU Layers: $GPU_LAYERS"
[ "${ENABLE_TOOL_CALLING:-false}" = "true" ] && info "Tool calling: enabled"
echo
echo "Press Ctrl+C to stop"
echo

exec $CMD
