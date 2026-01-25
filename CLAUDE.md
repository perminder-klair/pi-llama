# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pi-LLaMA is a self-hosted AI chat application for home servers with voice capabilities and persistent memory. It combines a React TypeScript frontend with a Python FastAPI backend, using llama.cpp for LLM inference with semantic memory search.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    NGINX GATEWAY (3080)                 │
│  Routes traffic to all services, serves static React    │
└──────┬──────────────────────────────────────────────────┘
       │
       ├─→ /v1/*        → llama-server:5000 (LLM API)
       ├─→ /memory/*    → memory-api:4000 (Memories + embeddings)
       ├─→ /whisper/*   → whisper:9000 (Speech-to-text)
       ├─→ /tts/*       → tts:8000 (Text-to-speech)
       └─→ /*           → React build (static SPA)
```

**Services:**
- **client/** - React 19 + TanStack Router frontend (Vite, Tailwind CSS, Shadcn/ui)
- **memory-api/** - FastAPI service for semantic memory storage with SQLite + vector embeddings
- **llama-server** - llama.cpp with Qwen3-4B model, OpenAI-compatible API
- **whisper** - Speech-to-text (faster_whisper)
- **tts** - Text-to-speech (Piper)

## Development Commands

### Frontend (client/)
```bash
npm install              # Install dependencies
npm run dev              # Dev server (port 3000)
npm run build            # Production build
npm run lint             # ESLint check
npm run format           # Prettier format
npm run test             # Run Vitest
```

### Memory API (memory-api/)
```bash
pip install -r requirements.txt
python main.py           # Runs on port 4000
```

### Docker (full stack)
```bash
make setup               # First-time: download model + build client
make up                  # Start all services
make down                # Stop all services
make logs                # View logs
make clean               # Remove model and client build
```

## Key Implementation Details

### Streaming Chat
- Uses Server-Sent Events (SSE) for real-time token streaming
- Parser in `client/src/lib/streaming.ts` handles OpenAI-compatible `data: {...}` format
- Nginx configured with `proxy_buffering off` for streaming support

### Memory System
- Saves user preferences/facts across sessions using semantic search
- Flow: text → llama-server:/embedding → vector → SQLite storage
- Search uses NumPy cosine similarity against stored embeddings
- Endpoints: `POST /memories`, `GET /memories/search?q=...`

### Tool Calling
- LLM invokes functions with structured arguments (OpenAI format)
- Components: `ToolCallBubble.tsx`, `ToolResultBubble.tsx`
- Requires `--jinja` flag on llama-server (enabled in docker-compose)

### Environment Variables
**Development:**
```
VITE_API_URL=http://localhost:3080
VITE_MEMORY_API_URL=http://localhost:4000
```

**Production:**
```
VITE_API_URL=                    # Relative paths via nginx
VITE_MEMORY_API_URL=/memory
```

## Tech Stack Notes

- **React 19** with TanStack Start for SSR prerendering
- **TanStack Router** with file-based routing in `src/routes/`
- **T3Env** for environment variable validation (`client/src/env.ts`)
- **Shadcn/ui** components - install with: `pnpm dlx shadcn@latest add <component>`
- Path alias: `@/` → `src/`

## Port Reference

| Service | Dev Port | Prod (via nginx) |
|---------|----------|------------------|
| Frontend | 3000 | 3080 (/) |
| LLM API | 5000 | 3080 (/v1/*) |
| Memory API | 4000 | 3080 (/memory/*) |
| Whisper | 9000 | 3080 (/whisper/*) |
| TTS | 8000 | 3080 (/tts/*) |
