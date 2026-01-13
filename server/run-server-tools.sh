#!/bin/bash
# Server start script with TOOL CALLING enabled
#
# NOTE: For better tool calling performance, consider using Qwen3-Coder instead:
#   Model: unsloth/Qwen3-Coder-30B-A3B-Instruct-GGUF
#   Qwen3-Coder has improved tool calling templates and better function calling accuracy.
#   https://huggingface.co/unsloth/Qwen3-Coder-30B-A3B-Instruct-GGUF

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LLAMA_DIR="$HOME/llama.cpp"
MODEL="$LLAMA_DIR/models/Qwen3-30B-A3B-Q4_K_M.gguf"

if [ ! -f "$MODEL" ]; then
    echo "Error: Model not found at $MODEL"
    echo "Run setup.sh first to download the model."
    exit 1
fi

echo "Starting Qwen3-30B-A3B server with TOOL CALLING on http://localhost:5000"
echo "Press Ctrl+C to stop"
echo

exec "$LLAMA_DIR/build/bin/llama-server" \
    -m "$MODEL" \
    --host 0.0.0.0 \
    --port 5000 \
    -c 8192 \
    -ngl 25 \
    -t 8 \
    --jinja \
    --path "$SCRIPT_DIR/../client/.output/public"
