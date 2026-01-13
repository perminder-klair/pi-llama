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
- Install dependencies (git, cmake, nginx, nodejs, etc.)
- Clone and build llama.cpp
- Download the Qwen 2.5 0.5B model
- Build and deploy the React chat app
- Configure the systemd service and nginx

## Chat Interfaces

After setup, access these routes in your browser:

| Route | Description |
|-------|-------------|
| `/` | Pi Chat - Simple chat with witty assistant |
| `/qwen3` | Qwen3 Chat - With thinking tags support |
| `/tools` | Qwen3 + Tools - Calculator, weather, time |

## Manual Setup

For step-by-step manual installation, see [SETUP.md](SETUP.md).

## Architecture

```
[Browser] --> [nginx :80] --> [React App]
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

# Rebuild chat app
./build.sh
```

## Access

Open `http://<pi-ip>` in your browser. The chat interface loads directly, with nginx proxying API calls to llama-server on port 8080.

## Files

| File | Description |
|------|-------------|
| `setup.sh` | Automated setup script |
| `build.sh` | Build the React chat app |
| `client/` | React chat application source |
| `llama.service` | systemd service definition |
| `nginx-chat` | nginx site configuration |
| `SETUP.md` | Manual setup guide |
