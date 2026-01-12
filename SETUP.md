# Pi 3 Setup Guide

Initial setup steps for running llama.cpp on a Raspberry Pi 3.

## System Optimization

### Packages to Remove

| Package | Purpose | Why Remove |
|---------|---------|------------|
| `triggerhappy` | Global hotkey daemon | Headless server, no keyboard shortcuts needed |
| `logrotate` | Rotates/compresses log files | Uses CPU cycles; logs aren't critical for this use |
| `dphys-swapfile` | Manages swap file on SD card | Swap kills SD cards over time |

```bash
sudo apt remove --purge triggerhappy logrotate dphys-swapfile
sudo apt autoremove
```

### Services to Disable

| Service | Purpose | Why Disable |
|---------|---------|-------------|
| `bluetooth` | Bluetooth stack | Not needed for LLM server |
| `hciuart` | Bluetooth UART interface | Related to above |
| `avahi-daemon` | mDNS/Bonjour discovery | Uses RAM (keep if you want `.local` hostnames) |

```bash
sudo systemctl disable bluetooth hciuart
sudo systemctl stop bluetooth hciuart

# Optional - only if you don't need raspberrypi.local
sudo systemctl disable avahi-daemon
sudo systemctl stop avahi-daemon
```

## Hardware Considerations

Pi 3 has **1GB RAM** which limits model choices.

### Expected Performance

| Model | RAM Needed | Speed | Pi 3 Compatible |
|-------|-----------|-------|-----------------|
| Qwen2.5-0.5B Q4_0 | ~400MB | 2-3 tok/s | Yes |
| TinyLlama 1.1B Q4_0 | ~800MB | 1-2 tok/s | Yes |
| Phi-2 2.7B | ~2GB+ | - | No |
| Llama 7B | ~4GB+ | - | No |

## Building llama.cpp

### Install Dependencies

```bash
sudo apt update
sudo apt install git g++ wget build-essential cmake
```

### Clone and Build

```bash
git clone https://github.com/ggerganov/llama.cpp.git ~/llama.cpp
cd ~/llama.cpp
```

**Option A: CMake build**
```bash
mkdir -p build && cd build
cmake ..
cmake --build . --config Release -j2
```

Binaries will be in `~/llama.cpp/build/bin/`.

**Option B: Makefile (simpler)**
```bash
make -j2
```

Binaries will be in `~/llama.cpp/`.

## Model Download

### Qwen2.5-0.5B-Instruct (Recommended)

**wget method:**
```bash
mkdir -p ~/llama.cpp/models && cd ~/llama.cpp/models
wget https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_0.gguf
```

**huggingface-cli method:**
```bash
pip install huggingface_hub --break-system-packages
huggingface-cli download Qwen/Qwen2.5-0.5B-Instruct-GGUF \
  qwen2.5-0.5b-instruct-q4_0.gguf \
  --local-dir ~/llama.cpp/models
```

### Quantization Options

| Quant | Size | Quality | Recommendation |
|-------|------|---------|----------------|
| q4_0 | ~400MB | Good | Best for Pi 3 |
| q4_k_m | ~450MB | Better | Should work |
| q5_k_m | ~500MB | Even better | Tight fit |
| q8_0 | ~530MB | Best | Risky on 1GB |

## Testing the Installation

**Basic test:**
```bash
~/llama.cpp/build/bin/llama-cli \
  -m ~/llama.cpp/models/qwen2.5-0.5b-instruct-q4_0.gguf \
  -p "Hello from Raspberry Pi!" -n 50
```

**Interactive chat:**
```bash
~/llama.cpp/build/bin/llama-cli \
  -m ~/llama.cpp/models/qwen2.5-0.5b-instruct-q4_0.gguf \
  -cnv -p "You are a helpful assistant."
```

## Next Steps

See [README.md](README.md) for systemd service setup and nginx configuration.
