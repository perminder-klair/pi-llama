# llama-server API Reference

API endpoints exposed by `llama-server` on `http://localhost:3080`.

## OpenAI-Compatible Endpoints

### POST /v1/chat/completions

Chat completion (most common endpoint).

```bash
curl http://localhost:3080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hello!"}
    ],
    "temperature": 0.7,
    "max_tokens": 512,
    "stream": false
  }'
```

**Response:**
```json
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "Hello! How can I help you today?"
    }
  }]
}
```

### POST /v1/completions

Text completion (non-chat).

```bash
curl http://localhost:3080/v1/completions \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "The quick brown fox",
    "max_tokens": 50
  }'
```

### POST /v1/embeddings

Generate embeddings for text.

```bash
curl http://localhost:3080/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Hello world"
  }'
```

### GET /v1/models

List available models.

```bash
curl http://localhost:3080/v1/models
```

---

## Native llama.cpp Endpoints

### GET /health

Health check.

```bash
curl http://localhost:3080/health
```

**Response:**
```json
{"status": "ok"}
```

### POST /completion

Native completion with more options than OpenAI endpoint.

```bash
curl http://localhost:3080/completion \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Hello",
    "n_predict": 128,
    "temperature": 0.7,
    "top_k": 40,
    "top_p": 0.95,
    "repeat_penalty": 1.1,
    "stream": false
  }'
```

### POST /tokenize

Convert text to tokens.

```bash
curl http://localhost:3080/tokenize \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello world"}'
```

### POST /detokenize

Convert tokens back to text.

```bash
curl http://localhost:3080/detokenize \
  -H "Content-Type: application/json" \
  -d '{"tokens": [9906, 1917]}'
```

### POST /embedding

Native embeddings endpoint.

```bash
curl http://localhost:3080/embedding \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello world"}'
```

### GET /props

Get server configuration.

```bash
curl http://localhost:3080/props
```

### GET /slots

View current processing slots.

```bash
curl http://localhost:3080/slots
```

### GET /metrics

Prometheus-compatible metrics.

```bash
curl http://localhost:3080/metrics
```

---

## Anthropic-Compatible Endpoints

### POST /v1/messages

Anthropic Messages API format.

```bash
curl http://localhost:3080/v1/messages \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ],
    "max_tokens": 512
  }'
```

---

## Other Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/infill` | Code infill/completion |
| POST | `/reranking` | Rerank documents by query |
| POST | `/apply-template` | Apply chat template |
| GET | `/lora-adapters` | List LoRA adapters |
| POST | `/lora-adapters` | Configure LoRA adapters |

---

## Streaming

Add `"stream": true` to any completion request for Server-Sent Events (SSE):

```bash
curl http://localhost:3080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": true
  }'
```

---

## Tool Calling (Function Calling)

Requires server started with `--jinja` flag (use `run-server-tools.sh`).

### Example: Weather Tool

**Step 1: Send request with tool definition**

```bash
curl http://localhost:3080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "What is the weather in Tokyo?"}
    ],
    "tools": [
      {
        "type": "function",
        "function": {
          "name": "get_weather",
          "description": "Get current weather for a location",
          "parameters": {
            "type": "object",
            "properties": {
              "location": {
                "type": "string",
                "description": "City name"
              },
              "unit": {
                "type": "string",
                "enum": ["celsius", "fahrenheit"],
                "description": "Temperature unit"
              }
            },
            "required": ["location"]
          }
        }
      }
    ]
  }'
```

**Step 2: Model responds with tool call**

```json
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": null,
      "tool_calls": [{
        "id": "call_abc123",
        "type": "function",
        "function": {
          "name": "get_weather",
          "arguments": "{\"location\": \"Tokyo\", \"unit\": \"celsius\"}"
        }
      }]
    },
    "finish_reason": "tool_calls"
  }]
}
```

**Step 3: Send tool result back**

```bash
curl http://localhost:3080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "What is the weather in Tokyo?"},
      {"role": "assistant", "content": null, "tool_calls": [{"id": "call_abc123", "type": "function", "function": {"name": "get_weather", "arguments": "{\"location\": \"Tokyo\"}"}}]},
      {"role": "tool", "tool_call_id": "call_abc123", "content": "{\"temperature\": 22, \"condition\": \"sunny\"}"}
    ],
    "tools": [...]
  }'
```

**Step 4: Model gives final response**

```json
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "The weather in Tokyo is currently sunny with a temperature of 22°C."
    }
  }]
}
```

### Parallel Tool Calls

Enable multiple simultaneous tool calls:

```json
{
  "messages": [...],
  "tools": [...],
  "parallel_tool_calls": true
}
```

---

## Thinking Mode (Qwen3)

Qwen3 models support a "thinking" mode where the model reasons through problems before answering. Output appears in `<think>...</think>` tags.

### Server Flag

Enable thinking content parsing with `--reasoning-format`:

```bash
llama-server -m model.gguf --reasoning-format deepseek
```

### Soft Switch: /think and /no_think

Control thinking per-turn by adding `/think` or `/no_think` to your message:

```bash
# Enable thinking for complex problems
curl http://localhost:3080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "/think What is 15% of 847?"}
    ]
  }'
```

**Response with thinking:**
```
<think>
To find 15% of 847:
15% = 0.15
847 × 0.15 = 127.05
</think>

15% of 847 is 127.05
```

```bash
# Disable thinking for simple queries
curl http://localhost:3080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "/no_think Hello!"}
    ]
  }'
```

### Disable Thinking Globally

To always disable thinking, use a custom chat template:

```bash
llama-server -m model.gguf --chat-template-file no-think-template.jinja
```

### When to Use Thinking

| Use Case | Mode | Why |
|----------|------|-----|
| Math, logic, coding | `/think` | Better accuracy |
| Simple chat, Q&A | `/no_think` | Faster response |
| Step-by-step problems | `/think` | Shows reasoning |

**Note:** The `enable_thinking` API parameter is not fully supported in llama.cpp. Use `/think` and `/no_think` in prompts instead.

---

## Voice Services

These services run alongside llama-server for voice integration.

### Speech-to-Text (Whisper) - `/whisper/*`

Uses [faster-whisper](https://github.com/ahmetoner/whisper-asr-webservice) for audio transcription.

#### POST /asr

Transcribe audio file to text.

```bash
# Basic transcription
curl -F "audio_file=@recording.wav" http://localhost:3080/whisper/asr

# With language hint
curl -F "audio_file=@recording.wav" \
     -F "language=en" \
     http://localhost:3080/whisper/asr

# Get timestamped output
curl -F "audio_file=@recording.wav" \
     -F "output=json" \
     http://localhost:3080/whisper/asr
```

**Supported formats:** WAV, MP3, FLAC, OGG, M4A

**Response (text):**
```
Hello, how are you today?
```

**Response (JSON with output=json):**
```json
{
  "text": "Hello, how are you today?",
  "segments": [
    {"start": 0.0, "end": 2.5, "text": "Hello, how are you today?"}
  ]
}
```

**Query parameters:**
- `language` - ISO language code (e.g., `en`, `ja`, `es`)
- `output` - Response format: `txt`, `json`, `vtt`, `srt`
- `task` - `transcribe` (default) or `translate` (to English)

**Swagger UI:** http://localhost:9000/docs (direct port, development only)

---

### Text-to-Speech (Piper) - `/tts/*`

Uses [openedai-speech](https://github.com/matatonic/openedai-speech) with Piper backend.

#### POST /v1/audio/speech

Generate speech audio from text (OpenAI-compatible).

```bash
# Generate MP3
curl -X POST http://localhost:3080/tts/v1/audio/speech \
  -H "Content-Type: application/json" \
  -d '{
    "model": "tts-1",
    "input": "Hello, how are you today?",
    "voice": "alloy"
  }' --output speech.mp3

# Generate WAV (better for Pico W)
curl -X POST http://localhost:3080/tts/v1/audio/speech \
  -H "Content-Type: application/json" \
  -d '{
    "model": "tts-1",
    "input": "Hello world",
    "voice": "alloy",
    "response_format": "wav"
  }' --output speech.wav
```

**Request body:**
```json
{
  "model": "tts-1",
  "input": "Text to speak",
  "voice": "alloy",
  "response_format": "mp3",
  "speed": 1.0
}
```

**Parameters:**
- `model` - `tts-1` (Piper, fast CPU) or `tts-1-hd` (XTTS, requires GPU)
- `input` - Text to convert to speech (max 4096 chars)
- `voice` - Voice name: `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`
- `response_format` - `mp3`, `opus`, `aac`, `flac`, `wav`, `pcm`
- `speed` - Speed multiplier 0.25 to 4.0 (default 1.0)

---

### Voice Pipeline Example

Complete flow from audio input to audio response:

```bash
# 1. Transcribe audio to text
TEXT=$(curl -s -F "audio_file=@question.wav" http://localhost:3080/whisper/asr)

# 2. Get LLM response
RESPONSE=$(curl -s http://localhost:3080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d "{\"messages\":[{\"role\":\"user\",\"content\":\"$TEXT\"}]}" \
  | jq -r '.choices[0].message.content')

# 3. Convert response to speech
curl -X POST http://localhost:3080/tts/v1/audio/speech \
  -H "Content-Type: application/json" \
  -d "{\"model\":\"tts-1\",\"input\":\"$RESPONSE\",\"voice\":\"alloy\"}" \
  --output response.mp3
```

---

## Service Access Summary

All services are accessed through the nginx gateway on port 3080.

| Service | Gateway Path | Direct Port (dev) | Description |
|---------|--------------|-------------------|-------------|
| Gateway | `:3080` | - | Nginx reverse proxy |
| LLM API | `/v1/*` | 5000 | Chat, completions, embeddings |
| Memory API | `/memory/*` | 4000 | Conversation memory |
| Whisper | `/whisper/*` | 9000 | Speech-to-Text (STT) |
| TTS | `/tts/*` | 8000 | Text-to-Speech (TTS) |

> **Note:** Direct port access (9000, 8000, 4000) is available when running services individually during development. Production deployments use gateway routing through port 3080.

---

## References

- [llama.cpp server README](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md)
- [Qwen3 llama.cpp guide](https://qwen.readthedocs.io/en/latest/run_locally/llama.cpp.html)
- [Qwen3 announcement](https://qwenlm.github.io/blog/qwen3/)
- [whisper-asr-webservice](https://github.com/ahmetoner/whisper-asr-webservice)
- [openedai-speech](https://github.com/matatonic/openedai-speech)
