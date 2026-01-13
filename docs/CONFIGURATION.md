# Pi-LLaMA Configuration Guide

This document explains all configuration options in `pi-llama.conf`.

## Quick Start

1. Copy a preset to create your config:
   ```bash
   # For Raspberry Pi
   cp configs/pi-llama.conf.pi pi-llama.conf

   # For Desktop
   cp configs/pi-llama.conf.desktop pi-llama.conf
   ```

2. Edit `pi-llama.conf` as needed

3. Run setup:
   ```bash
   ./scripts/setup.sh
   ```

## Configuration Options

### Environment

```bash
ENVIRONMENT="pi"  # or "desktop"
```

Determines the setup behavior:
- `pi`: Installs systemd service, configures nginx, optimizes for low memory
- `desktop`: Manual server start, serves static files directly, optimizes for performance

### Package Manager

```bash
PACKAGE_MANAGER="apt"  # apt, pacman, or dnf
```

Used by `setup.sh` to install dependencies:
- `apt`: Debian/Ubuntu/Raspberry Pi OS
- `pacman`: Arch Linux
- `dnf`: Fedora/RHEL

### Server Configuration

```bash
SERVER_PORT=5000
SERVER_HOST="0.0.0.0"
```

- `SERVER_PORT`: Port for llama-server (default: 5000)
- `SERVER_HOST`: Bind address (0.0.0.0 = all interfaces)

### Model Configuration

```bash
MODEL_NAME="qwen2.5-0.5b-instruct-q4_0.gguf"
MODEL_URL="https://huggingface.co/..."
```

- `MODEL_NAME`: Filename of the GGUF model
- `MODEL_URL`: Download URL (used by setup.sh)

#### Recommended Models

| Environment | Model | Size | RAM Required |
|-------------|-------|------|--------------|
| Pi | qwen2.5-0.5b-instruct-q4_0.gguf | ~400MB | 1GB+ |
| Desktop | Qwen3-30B-A3B-Q4_K_M.gguf | ~18.6GB | 24GB+ |

### llama-server Parameters

```bash
CONTEXT_SIZE=2048
GPU_LAYERS=0
CPU_THREADS=2
ENABLE_TOOL_CALLING=false
ENABLE_EMBEDDING=false
```

- `CONTEXT_SIZE`: Maximum context length (tokens)
  - Pi: 2048 (memory limited)
  - Desktop: 8192 or higher

- `GPU_LAYERS`: Number of layers to offload to GPU
  - 0 = CPU only
  - 25-30 = Good for 8GB VRAM
  - Higher = More VRAM needed

- `CPU_THREADS`: Threads for CPU inference
  - Pi: 2-4
  - Desktop: 8+

- `ENABLE_TOOL_CALLING`: Enable function/tool calling
  - Adds `--jinja` flag to llama-server
  - Required for agentic use cases

- `ENABLE_EMBEDDING`: Enable embedding generation
  - Adds `--embedding` flag

### Service Configuration (Pi only)

```bash
USE_SYSTEMD=true
USE_NGINX=true
NGINX_PORT=80
```

- `USE_SYSTEMD`: Install and enable systemd service
- `USE_NGINX`: Configure nginx as reverse proxy
- `NGINX_PORT`: Port for nginx (default: 80)

### Custom Paths

```bash
LLAMA_DIR=""
MODEL_DIR=""
```

Leave empty for defaults:
- `LLAMA_DIR`: `$HOME/llama.cpp`
- `MODEL_DIR`: `$LLAMA_DIR/models`

## Preset Comparison

| Setting | Pi Preset | Desktop Preset |
|---------|-----------|----------------|
| ENVIRONMENT | pi | desktop |
| PACKAGE_MANAGER | apt | pacman |
| MODEL_NAME | qwen2.5-0.5b-instruct | Qwen3-30B-A3B |
| CONTEXT_SIZE | 2048 | 8192 |
| GPU_LAYERS | 0 | 25 |
| CPU_THREADS | 2 | 8 |
| ENABLE_TOOL_CALLING | false | true |
| USE_SYSTEMD | true | false |
| USE_NGINX | true | false |

## GPU Offloading Guide (Desktop)

For AMD iGPU with 8GB VRAM:

| GPU Layers | VRAM Usage | Performance |
|------------|------------|-------------|
| 0 | ~500MB | CPU only (slowest) |
| 20-25 | ~5-6GB | Conservative |
| 28-30 | ~7-8GB | Good balance |
| 35+ | 8GB+ | May cause OOM |

Start with 25 layers and adjust based on your hardware.

## Changing Configuration

After modifying `pi-llama.conf`:

**Desktop:**
```bash
# Just restart the server
./scripts/server.sh
```

**Pi (with systemd):**
```bash
# Regenerate and restart service
./scripts/setup.sh
# Or manually:
sudo systemctl restart llama
```
