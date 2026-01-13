# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pi-LLaMA is a unified setup for running a self-hosted LLaMA chat server using llama.cpp. It works on both Raspberry Pi and desktop systems, with configuration-based environment detection.

## Architecture

**Desktop mode:**
```
[Browser] --> [llama-server :5000] --> [React App + API]
```

**Pi mode:**
```
[Browser] --> [nginx :80] --> [React App]
                  |
                  +--> [llama-server :5000] (OpenAI-compatible API)
```

## Project Structure

```
pi-llama/
├── pi-llama.conf              # User configuration (created from preset)
├── scripts/
│   ├── common.sh              # Shared functions
│   ├── setup.sh               # Unified setup (apt/pacman)
│   ├── server.sh              # Start llama-server
│   ├── chat.sh                # CLI chat interface
│   └── build.sh               # Build React client
├── configs/
│   ├── pi-llama.conf.pi       # Pi preset
│   ├── pi-llama.conf.desktop  # Desktop preset
│   ├── llama.service.template # Systemd template
│   └── nginx-chat.template    # Nginx template
├── docs/
│   ├── CONFIGURATION.md       # Config reference
│   └── LLAMA-API.md           # API documentation
├── client/                    # React chat application
└── memory-api/                # Memory API service
```

## Key Files

- `pi-llama.conf` - Main configuration file (environment, model, ports, etc.)
- `scripts/setup.sh` - Unified setup script (handles both apt and pacman)
- `scripts/server.sh` - Start llama-server with config-based parameters
- `client/` - React chat application source

## Configuration

The project uses `pi-llama.conf` for all settings:

```bash
# Create config from preset
cp configs/pi-llama.conf.desktop pi-llama.conf  # Desktop
cp configs/pi-llama.conf.pi pi-llama.conf       # Pi
```

Key settings:
- `ENVIRONMENT`: "pi" or "desktop"
- `MODEL_NAME`: GGUF model filename
- `SERVER_PORT`: Default 5000
- `GPU_LAYERS`: GPU offload layers (0 for CPU-only)
- `ENABLE_TOOL_CALLING`: Enable --jinja for function calling

## External Dependencies

llama.cpp at `~/llama.cpp/`:
- Binary: `~/llama.cpp/build/bin/llama-server`
- CLI: `~/llama.cpp/build/bin/llama-cli`
- Models: `~/llama.cpp/models/`

## Common Commands

```bash
# Setup (installs deps, builds llama.cpp, downloads model)
./scripts/setup.sh

# Start server
./scripts/server.sh

# CLI chat
./scripts/chat.sh

# Rebuild React app
./scripts/build.sh

# (Pi) Service management
sudo systemctl status llama
sudo systemctl restart llama
journalctl -u llama -f
```

## Development Notes

- Port is unified to 5000 for all environments
- Scripts source `scripts/common.sh` for shared functions
- Config uses shell variable syntax (sourceable with `source pi-llama.conf`)
- Templates use `%PLACEHOLDER%` syntax for sed substitution
