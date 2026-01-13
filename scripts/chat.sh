#!/bin/bash
set -e

# Pi-LLaMA CLI Chat Script
# Interactive chat using llama-cli

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"
load_config

MODEL_PATH="$MODEL_DIR/$MODEL_NAME"
CLI_BIN="$LLAMA_DIR/build/bin/llama-cli"

if [ ! -f "$MODEL_PATH" ]; then
    error "Model not found: $MODEL_PATH\nRun: ./scripts/setup.sh"
fi

if [ ! -f "$CLI_BIN" ]; then
    error "llama-cli not found: $CLI_BIN\nRun: ./scripts/setup.sh"
fi

echo "================================"
echo "  Pi-LLaMA CLI Chat"
echo "  Model: $MODEL_NAME"
echo "================================"
echo
echo "Type your message and press Enter."
echo "Type 'exit' or Ctrl+C to quit."
echo

exec "$CLI_BIN" \
    -m "$MODEL_PATH" \
    -cnv \
    -p "You are a helpful assistant." \
    -n 256
