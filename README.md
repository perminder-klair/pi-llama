# Pi-LLaMA

A self-hosted AI chat application for home servers with voice capabilities and persistent memory.

## Features

- **Local LLM Inference** - Runs Qwen3-4B via llama.cpp with OpenAI-compatible API
- **Streaming Responses** - Real-time token streaming via Server-Sent Events
- **Semantic Memory** - Persistent memory storage with vector embeddings for context-aware conversations
- **Voice Integration** - Speech-to-text (Whisper) and text-to-speech (Piper)
- **Tool Calling** - Function calling support for extensible capabilities
- **Single Gateway** - All services accessible through one nginx endpoint

## Quick Start

```bash
# First-time setup (downloads model + builds client)
make setup

# Start all services
make up

# Access the chat interface
open http://localhost:3080
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    NGINX GATEWAY (3080)                 │
└──────┬──────────────────────────────────────────────────┘
       │
       ├─→ /v1/*        → llama-server (LLM API)
       ├─→ /memory/*    → memory-api (Semantic memory)
       ├─→ /whisper/*   → whisper (Speech-to-text)
       ├─→ /tts/*       → tts (Text-to-speech)
       └─→ /*           → React frontend
```

## Services

| Service | Description | Port |
|---------|-------------|------|
| **Gateway** | Nginx reverse proxy | 3080 |
| **LLM Server** | llama.cpp with Qwen3-4B | internal |
| **Memory API** | FastAPI + SQLite + embeddings | internal |
| **Whisper** | faster_whisper ASR | internal |
| **TTS** | Piper text-to-speech | internal |

## Make Commands

| Command | Description |
|---------|-------------|
| `make setup` | First-time setup (download model + build client) |
| `make up` | Start all services |
| `make down` | Stop all services |
| `make restart` | Restart all services |
| `make logs` | View logs |
| `make clean` | Remove model and client build |
| `make test-install` | Install test dependencies |
| `make test` | Run all integration tests |
| `make test-health` | Run health check tests only |

## Development

### Frontend
```bash
cd client
npm install
npm run dev     # http://localhost:3000
```

### Memory API
```bash
cd memory-api
pip install -r requirements.txt
python main.py  # http://localhost:4000
```

### Full Stack
```bash
docker-compose up
```

## Configuration

Environment variables in `.env`:

| Variable | Description | Default |
|----------|-------------|---------|
| `MODEL_NAME` | GGUF model filename | Qwen3-4B-Q4_K_M.gguf |
| `MODEL_URL` | Download URL for model | Hugging Face (unsloth/Qwen3-4B-GGUF) |
| `CONTEXT_SIZE` | LLM context window | 8192 |

## API Reference

See [docs/LLAMA-API.md](docs/LLAMA-API.md) for complete API documentation including:
- Chat completions
- Embeddings
- Tool calling
- Voice services (STT/TTS)

## Tech Stack

- **Frontend**: React 19, TanStack Router, Tailwind CSS, Shadcn/ui
- **Backend**: FastAPI, SQLite, NumPy
- **LLM**: llama.cpp, Qwen3-4B
- **Voice**: faster_whisper, Piper TTS
- **Infrastructure**: Docker, Nginx
