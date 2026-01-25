# Pi-LLaMA Client

React 19 TypeScript frontend for Pi-LLaMA, a self-hosted AI chat application with voice capabilities and persistent memory.

## Tech Stack

- **React 19** with TanStack Router (file-based routing)
- **Vite 7** for development and builds
- **Tailwind CSS 4** with custom design tokens
- **Shadcn/ui** components
- **TypeScript** with strict mode

## Getting Started

```bash
npm install      # Install dependencies
npm run dev      # Start dev server (port 3000)
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run test` | Run Vitest tests |
| `npm run lint` | ESLint check |
| `npm run format` | Prettier format |
| `npm run check` | Format + lint with auto-fix |

## Project Structure

```
src/
├── components/
│   ├── chat/           # Chat UI components
│   │   ├── ChatHeader.tsx
│   │   ├── ChatInput.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── ToolCallBubble.tsx
│   │   └── ToolResultBubble.tsx
│   └── voice/          # Voice/audio components
│       ├── VoiceInput.tsx
│       ├── AudioPlayback.tsx
│       └── VoiceSettings.tsx
├── hooks/              # Custom React hooks
│   ├── useAudioRecorder.ts
│   ├── useSpeechToText.ts
│   └── useTextToSpeech.ts
├── lib/                # Utilities and libraries
│   ├── streaming.ts    # SSE streaming parser
│   ├── chat-utils.ts   # Thinking tag processor
│   ├── chat-types.ts   # TypeScript types
│   ├── tools.ts        # Tool definitions & executors
│   ├── voice-api.ts    # Whisper/TTS API clients
│   └── utils.ts        # General utilities
├── routes/             # File-based routing pages
│   ├── index.tsx       # Simple chat (/)
│   ├── qwen3.tsx       # Qwen3 model chat (/qwen3)
│   ├── tools.tsx       # Chat with tool calling (/tools)
│   └── voice.tsx       # Voice chat (/voice)
├── env.ts              # Environment variable validation
├── router.tsx          # Router configuration
└── styles.css          # Global Tailwind + theme CSS
```

## Routes

| Route | Description |
|-------|-------------|
| `/` | Simple text chat interface |
| `/qwen3` | Qwen3 model with thinking visibility |
| `/tools` | Advanced chat with tool calling (weather, calculator, memory) |
| `/voice` | Voice input/output with speech-to-text and text-to-speech |

## Features

### Streaming Chat
Real-time token streaming using Server-Sent Events (SSE) with OpenAI-compatible format.

### Tool Calling
5 built-in tools:
- `get_weather` - Weather lookup
- `calculator` - Math evaluation
- `get_time` - Current date/time
- `save_memory` - Persist user facts
- `recall_memories` - Search saved memories

### Voice Integration
- Audio recording via MediaRecorder API
- Speech-to-text via Whisper
- Text-to-speech via Piper (6 voice options)
- Visual waveform during recording

### Thinking Tags
Support for Qwen3's `<think>` tags to display model reasoning separately from output.

## Environment Variables

**Development** (`.env.development`):
```
VITE_API_URL=http://localhost:3000
VITE_MEMORY_API_URL=http://localhost:4000
```

**Production** (`.env.production`):
```
VITE_API_URL=
VITE_MEMORY_API_URL=/memory
```

## API Endpoints

All endpoints accessed via nginx gateway in production:

| Endpoint | Service | Purpose |
|----------|---------|---------|
| `/v1/chat/completions` | llama-server | LLM chat streaming |
| `/whisper/asr` | whisper | Speech-to-text |
| `/tts/v1/audio/speech` | tts | Text-to-speech |
| `/memory/memories` | memory-api | Save memories |
| `/memory/memories/search` | memory-api | Search memories |

## Adding UI Components

Uses Shadcn/ui. Add components with:

```bash
pnpm dlx shadcn@latest add <component>
```

## Path Alias

`@/` maps to `src/` for clean imports:

```typescript
import { Button } from '@/components/ui/button'
```
