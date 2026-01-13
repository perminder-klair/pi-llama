# Memory API for Pi-LLaMA

A lightweight memory storage service that enables the LLM chat to remember user preferences and facts across sessions using semantic search.

## Architecture

```
[Browser Chat] → [Memory API :3000] → [SQLite + Embeddings]
                         ↓
                 [llama-server :8080/embedding]
```

- **SQLite** stores memories with their vector embeddings
- **llama-server** generates embeddings via `/embedding` endpoint
- **Semantic search** finds relevant memories based on meaning, not just keywords

## Setup

### 1. Install Python dependencies

```bash
cd memory-api
pip install -r requirements.txt
```

### 2. Enable embeddings in llama-server

The `llama.service` has been updated with `--embedding` flag. Redeploy:

```bash
sudo cp llama.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl restart llama
```

### 3. Deploy Memory API service

```bash
sudo cp memory.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable memory
sudo systemctl start memory
```

### 4. Verify

```bash
# Check embedding endpoint
curl http://localhost:8080/embedding -d '{"content":"test"}'

# Check memory API
curl http://localhost:3000/

# Save a memory
curl -X POST http://localhost:3000/memories \
  -H "Content-Type: application/json" \
  -d '{"content": "User prefers dark mode", "category": "preference"}'

# Search memories
curl "http://localhost:3000/memories/search?q=theme%20preference"
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/memories` | Save a new memory |
| GET | `/memories` | List all memories |
| GET | `/memories/search?q=...` | Semantic search |
| DELETE | `/memories/:id` | Delete a memory |

### Save Memory

```json
POST /memories
{
  "content": "User's name is Alex",
  "category": "personal"
}
```

### Search Memories

```json
GET /memories/search?q=name&limit=5

Response:
{
  "query": "name",
  "results": [
    {
      "id": 1,
      "content": "User's name is Alex",
      "category": "personal",
      "similarity": 0.8721
    }
  ]
}
```

## Files

| File | Purpose |
|------|---------|
| `main.py` | FastAPI endpoints |
| `database.py` | SQLite + vector similarity |
| `requirements.txt` | Python dependencies |
| `memories.db` | SQLite database (auto-created) |

## How It Works

1. When saving a memory, the content is sent to llama-server's `/embedding` endpoint
2. The embedding vector (typically 384-2048 dimensions) is stored alongside the text
3. When searching, the query is embedded and compared using cosine similarity
4. Results are ranked by semantic relevance, not just keyword matching

## Resource Usage

- Database: ~1KB per memory (text + embedding)
- Memory API: ~50MB RAM
- Embedding generation: ~100ms per call
