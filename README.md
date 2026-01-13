# Pi-LLaMA

A unified setup for running a self-hosted LLaMA chat server using llama.cpp. Works on both Raspberry Pi and desktop systems.

## Quick Start

### 1. Clone and configure

```bash
git clone https://github.com/yourusername/pi-llama.git
cd pi-llama

# Copy a preset config
cp configs/pi-llama.conf.pi pi-llama.conf      # For Raspberry Pi
cp configs/pi-llama.conf.desktop pi-llama.conf # For Desktop
```

### 2. Run setup

```bash
./scripts/setup.sh
```

The script will:
- Install dependencies (git, cmake, nodejs, etc.)
- Clone and build llama.cpp
- Download the appropriate model
- Build the React chat app
- (Pi only) Configure systemd service and nginx

### 3. Start the server

**Desktop:**
```bash
./scripts/server.sh
# Access at http://localhost:5000
```

**Pi (automatic via systemd):**
```bash
# Access at http://<pi-ip>
```

## Chat Interfaces

| Route | Description |
|-------|-------------|
| `/` | Simple chat interface |
| `/qwen3` | Chat with thinking tags support |
| `/tools` | Chat with tool calling (calculator, weather, time) |

## Architecture

```
[Browser] --> [nginx :80] --> [React App]    (Pi)
                  |
                  +--> [llama-server :5000]
                  +--> [memory-api :4000]

[Browser] --> [llama-server :5000] --> [React App + API]  (Desktop)
                  |
                  +--> [memory-api :4000]
```

## Project Structure

```
pi-llama/
├── pi-llama.conf              # Your configuration
├── scripts/
│   ├── setup.sh               # Unified setup script
│   ├── server.sh              # Start the server
│   ├── chat.sh                # CLI chat interface
│   └── build.sh               # Build React client
├── configs/
│   ├── pi-llama.conf.pi       # Pi preset
│   ├── pi-llama.conf.desktop  # Desktop preset
│   └── *.template             # Service templates
├── docs/
│   ├── CONFIGURATION.md       # Config file reference
│   └── LLAMA-API.md           # API documentation
├── client/                    # React chat application
└── memory-api/                # Memory API service (port 4000)
```

## Configuration

Edit `pi-llama.conf` to customize:

| Setting | Pi Default | Desktop Default |
|---------|------------|-----------------|
| MODEL_NAME | qwen2.5-0.5b | Qwen3-30B-A3B |
| SERVER_PORT | 5000 | 5000 |
| GPU_LAYERS | 0 | 25 |
| CONTEXT_SIZE | 2048 | 8192 |
| ENABLE_TOOL_CALLING | false | true |

See [docs/CONFIGURATION.md](docs/CONFIGURATION.md) for all options.

## Memory API

The memory API service provides persistent memory storage for conversations:

| Endpoint | Description |
|----------|-------------|
| `GET /memories` | List all memories |
| `POST /memories` | Save a new memory |
| `GET /memories/search?q=...` | Semantic search |
| `DELETE /memories/{id}` | Delete a memory |

Runs on port 4000 by default (configurable via `MEMORY_API_PORT` env var).

## Useful Commands

```bash
# Start server manually
./scripts/server.sh

# Start all services (server + memory API)
./scripts/start-all.sh

# Development mode (server + memory API + React hot reload)
./scripts/server_dev.sh

# CLI chat
./scripts/chat.sh

# Rebuild React app
./scripts/build.sh

# (Pi) Check service status
sudo systemctl status llama

# (Pi) View logs
journalctl -u llama -f
```

## Files Reference

| File | Description |
|------|-------------|
| `scripts/setup.sh` | Automated setup (apt/pacman) |
| `scripts/server.sh` | Start llama-server |
| `scripts/start-all.sh` | Start server + memory API |
| `scripts/server_dev.sh` | Dev mode with hot reload |
| `scripts/chat.sh` | Interactive CLI chat |
| `scripts/build.sh` | Build React app |
| `configs/pi-llama.conf.*` | Configuration presets |
| `docs/LLAMA-API.md` | llama-server API reference |

## Requirements

**Raspberry Pi:**
- Raspberry Pi 4/5 with 2GB+ RAM
- Raspberry Pi OS (64-bit recommended)
- 4GB+ free disk space

**Desktop:**
- 24GB+ RAM (for Qwen3-30B model)
- 25GB+ free disk space
- Arch Linux, Ubuntu, or Fedora
