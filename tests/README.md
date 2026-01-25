# Pi-LLaMA Integration Tests

Pytest-based integration tests to verify all services are working when the stack is running.

## Prerequisites

- Docker services running (`make up`)
- Python 3.10+
- Test dependencies installed

## Setup

```bash
# Install test dependencies
make test-install

# Or manually:
pip install -r tests/requirements.txt
```

## Running Tests

```bash
# Start services first
make up

# Wait for services to initialize (~30s for LLM to load)

# Run all tests
make test

# Run specific test files
pytest tests/test_health.py -v    # Health checks only
pytest tests/test_llm.py -v       # LLM tests only
pytest tests/test_memory.py -v    # Memory API tests only
pytest tests/test_tts.py -v       # TTS tests only
pytest tests/test_whisper.py -v   # Whisper tests only
pytest tests/test_roundtrip.py -v # Round-trip tests only
```

## Configuration

Set `TEST_BASE_URL` environment variable to test against a different host:

```bash
TEST_BASE_URL=http://192.168.1.100:3080 pytest tests/ -v
```

Default: `http://localhost:3080`

## Test Summary

| File | Tests | Description |
|------|-------|-------------|
| `test_health.py` | 3 | Health checks for gateway, LLM, and memory API |
| `test_llm.py` | 3 | Chat completions, streaming, and embeddings |
| `test_memory.py` | 5 | Memory CRUD operations and semantic search |
| `test_tts.py` | 2 | Text-to-speech audio generation |
| `test_whisper.py` | 1 | Speech-to-text transcription |
| `test_roundtrip.py` | 1 | TTS → Whisper round-trip verification |

**Total: 15 tests**

## Test Details

### Health Checks (`test_health.py`)
- Gateway serves React frontend (HTML response)
- LLM server `/health` returns `{"status": "ok"}`
- Memory API `/memory/` returns service status

### LLM Tests (`test_llm.py`)
- Basic chat completion returns valid response with content
- Streaming chat returns SSE tokens
- Embeddings endpoint returns vector array

### Memory Tests (`test_memory.py`)
- Create memory with embedding
- List all memories
- Semantic search returns relevant results
- Delete memory successfully
- Delete nonexistent memory returns 404

### TTS Tests (`test_tts.py`)
- Generate speech returns audio binary data
- Response has valid audio content type

### Whisper Tests (`test_whisper.py`)
- Transcribe TTS-generated audio returns text

### Round-trip Tests (`test_roundtrip.py`)
- Generate speech → transcribe → verify key words match

## Timeouts

Tests have individual timeouts to handle slow operations:
- Health checks: default (no timeout)
- LLM operations: 120s
- Memory operations: 30-60s
- TTS/Whisper: 60-120s
- Round-trip: 180s

## Troubleshooting

**Tests fail to connect:**
- Ensure services are running: `make up`
- Check logs: `make logs`
- Verify nginx is accessible: `curl http://localhost:3080/`

**LLM tests timeout:**
- Model may still be loading. Wait 30-60s after `make up`
- Check LLM logs: `docker-compose logs llama-server`

**Memory tests fail:**
- Verify memory API: `curl http://localhost:3080/memory/`
- Check embeddings work: LLM server needs `--embedding` flag
