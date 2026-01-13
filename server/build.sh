#!/bin/bash
# Build the React app for static serving

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$SCRIPT_DIR/../client"
npm run build

echo
echo "Build complete. Output in: $SCRIPT_DIR/../client/.output/public"
