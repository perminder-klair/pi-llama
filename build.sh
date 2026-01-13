#!/bin/bash
# Build the React chat app

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Building React chat app..."
cd "$SCRIPT_DIR/client"

if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

npm run build

echo
echo "Build complete!"
echo "Output: $SCRIPT_DIR/client/.output/public/"
echo
echo "Routes available:"
echo "  /       - Pi Chat"
echo "  /qwen3  - Qwen3 Chat"
echo "  /tools  - Qwen3 Chat + Tools"
