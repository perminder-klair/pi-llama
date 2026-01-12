#!/bin/bash
~/llama.cpp/build/bin/llama-server \
  -m ~/llama.cpp/models/qwen2.5-0.5b-instruct-q4_0.gguf \
  --host 0.0.0.0 \
  --port 8080
