# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Raspberry Pi setup for running a self-hosted LLaMA chat server using llama.cpp. It provides a simple web-based chat interface that connects to a locally running LLM.

## Architecture

```
[Browser] --> [nginx :80] --> [chat.html]
                  |
                  +--> [llama-server :8080] (OpenAI-compatible API)
```

- **llama-server**: llama.cpp server running the Qwen3 0.6B model, exposes OpenAI-compatible `/v1/chat/completions` endpoint
- **nginx**: Reverse proxy serving the static chat UI and proxying API calls to llama-server
- **chat.html**: Minimal single-file chat interface that calls the local LLM API

## Key Files

- `llama.service` - systemd service definition for llama-server
- `chat.html` - Web chat interface (deploys to `/var/www/chat/`)
- `llm-server.sh` - Script to manually start llama-server
- `llm-chat.sh` - Script to run interactive CLI chat

## External Dependencies

llama.cpp must be built and installed at `~/llama.cpp/`:
- Binary: `~/llama.cpp/build/bin/llama-server`
- CLI: `~/llama.cpp/build/bin/llama-cli`
- Model: `~/llama.cpp/models/qwen3-0.6b-q4_0.gguf`

## Service Management

```bash
# Start/stop/restart the LLM server
sudo systemctl start llama
sudo systemctl stop llama
sudo systemctl restart llama

# View logs
journalctl -u llama -f

# Check status
sudo systemctl status llama
```

## Deployment

After modifying `chat.html`, copy it to the web directory:
```bash
sudo cp chat.html /var/www/chat/
sudo chown www-data:www-data /var/www/chat/chat.html
```

To update the systemd service:
```bash
sudo cp llama.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl restart llama
```
