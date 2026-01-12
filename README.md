# Pi LLaMA

A Raspberry Pi setup for running a self-hosted LLaMA chat server using llama.cpp.

## Quick Start

Run the setup script on a fresh Raspberry Pi OS:

```bash
git clone https://github.com/yourusername/pi-llama.git
cd pi-llama
./setup.sh
```

The script will:
- Install dependencies (git, cmake, nginx, etc.)
- Clone and build llama.cpp
- Download the Qwen3 0.6B model
- Configure the systemd service and nginx

## Manual Setup

For step-by-step manual installation, see [SETUP.md](SETUP.md).

## Architecture

```
[Browser] --> [nginx :80] --> [chat.html]
                  |
                  +--> [llama-server :8080] (OpenAI-compatible API)
```

## Useful Commands

```bash
# Check status
sudo systemctl status llama

# View logs
journalctl -u llama -f

# Stop/restart
sudo systemctl stop llama
sudo systemctl restart llama
```

## Access

Open `http://<pi-ip>` in your browser. The chat interface loads directly, with nginx proxying API calls to llama-server on port 8080.

## Files

| File | Description |
|------|-------------|
| `setup.sh` | Automated setup script |
| `chat.html` | Web chat interface |
| `llama.service` | systemd service definition |
| `SETUP.md` | Manual setup guide |
