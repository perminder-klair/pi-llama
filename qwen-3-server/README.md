# Qwen3-30B-A3B Server

Local LLM chat server using Qwen3-30B-A3B with llama.cpp.

## Requirements

- Arch Linux (or similar with pacman)
- 24GB+ RAM
- 25GB+ free disk space
- sudo access

## Setup

```bash
./setup.sh
```

This will:
1. Install dependencies (cmake, ninja)
2. Clone and build llama.cpp
3. Download the Q4_K_M model (~18.6GB)

## Usage

```bash
./run-server.sh
```

Open http://localhost:5000 in your browser.

## Files

| File | Description |
|------|-------------|
| `setup.sh` | One-time setup script |
| `run-server.sh` | Start the server on port 5000 |
| `chat.html` | Web chat interface |

## Model

- **Name**: Qwen3-30B-A3B-Q4_K_M.gguf
- **Size**: ~18.6GB
- **Source**: [unsloth/Qwen3-30B-A3B-GGUF](https://huggingface.co/unsloth/Qwen3-30B-A3B-GGUF)
- **Location**: `~/llama.cpp/models/`

## Configuration

Edit `run-server.sh` to change:
- `--port 5000` - Server port
- `-c 8192` - Context length (max 32768)
- `-ngl 25` - GPU layers to offload (0 = CPU only, higher = more VRAM)
- `-t 8` - CPU threads for non-GPU layers

### GPU Offloading

For systems with AMD iGPU (e.g., UM760 with 8GB VRAM):

| Layers | VRAM | Notes |
|--------|------|-------|
| 0 | ~500MB | CPU only, slowest |
| 20-25 | ~5-6GB | Conservative |
| 28-30 | ~7-8GB | Good balance |
| 35+ | 8GB+ | May OOM |

Monitor usage: `watch -n 1 rocm-smi`
