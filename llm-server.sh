#!/bin/bash
~/llama.cpp/build/bin/llama-server \
  -m ~/llama.cpp/models/qwen3-0.6b-q4_0.gguf \
  --host 0.0.0.0 \
  --port 8080
