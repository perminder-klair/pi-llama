#!/bin/bash
~/llama.cpp/build/bin/llama-cli \
  -m ~/llama.cpp/models/qwen2.5-0.5b-instruct-q4_0.gguf \
  -cnv \
  -p "You are a helpful assistant." \
  -n 256
