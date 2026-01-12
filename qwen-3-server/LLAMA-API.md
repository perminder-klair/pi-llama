# llama-server API Reference

API endpoints exposed by `llama-server` on `http://localhost:5000`.

## OpenAI-Compatible Endpoints

### POST /v1/chat/completions

Chat completion (most common endpoint).

```bash
curl http://localhost:5000/v1/chat/completions \
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
curl http://localhost:5000/v1/completions \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "The quick brown fox",
    "max_tokens": 50
  }'
```

### POST /v1/embeddings

Generate embeddings for text.

```bash
curl http://localhost:5000/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Hello world"
  }'
```

### GET /v1/models

List available models.

```bash
curl http://localhost:5000/v1/models
```

---

## Native llama.cpp Endpoints

### GET /health

Health check.

```bash
curl http://localhost:5000/health
```

**Response:**
```json
{"status": "ok"}
```

### POST /completion

Native completion with more options than OpenAI endpoint.

```bash
curl http://localhost:5000/completion \
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
curl http://localhost:5000/tokenize \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello world"}'
```

### POST /detokenize

Convert tokens back to text.

```bash
curl http://localhost:5000/detokenize \
  -H "Content-Type: application/json" \
  -d '{"tokens": [9906, 1917]}'
```

### POST /embedding

Native embeddings endpoint.

```bash
curl http://localhost:5000/embedding \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello world"}'
```

### GET /props

Get server configuration.

```bash
curl http://localhost:5000/props
```

### GET /slots

View current processing slots.

```bash
curl http://localhost:5000/slots
```

### GET /metrics

Prometheus-compatible metrics.

```bash
curl http://localhost:5000/metrics
```

---

## Anthropic-Compatible Endpoints

### POST /v1/messages

Anthropic Messages API format.

```bash
curl http://localhost:5000/v1/messages \
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
curl http://localhost:5000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": true
  }'
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
curl http://localhost:5000/v1/chat/completions \
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
curl http://localhost:5000/v1/chat/completions \
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

## References

- [llama.cpp server README](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md)
- [Qwen3 llama.cpp guide](https://qwen.readthedocs.io/en/latest/run_locally/llama.cpp.html)
- [Qwen3 announcement](https://qwenlm.github.io/blog/qwen3/)
