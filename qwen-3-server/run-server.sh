#!/bin/bash
# Manual server start script for Qwen3-30B-A3B

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LLAMA_DIR="$HOME/llama.cpp"
MODEL="$LLAMA_DIR/models/Qwen3-30B-A3B-Q4_K_M.gguf"

if [ ! -f "$MODEL" ]; then
    echo "Error: Model not found at $MODEL"
    echo "Run setup.sh first to download the model."
    exit 1
fi

echo "Starting Qwen3-30B-A3B server on http://localhost:5000"
echo "Press Ctrl+C to stop"
echo

exec "$LLAMA_DIR/build/bin/llama-server" \
    -m "$MODEL" \
    --host 0.0.0.0 \
    --port 5000 \
    -c 8192 \
    -ngl 25 \
    -t 8 \
    --path "$SCRIPT_DIR"
