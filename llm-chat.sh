#!/bin/bash
~/llama.cpp/build/bin/llama-cli \
  -m ~/llama.cpp/models/qwen3-0.6b-q4_0.gguf \
  -cnv \
  -p "You are a helpful assistant." \
  -n 256
