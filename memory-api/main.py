"""FastAPI Memory API for Pi-LLaMA."""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from database import (
    save_memory,
    search_memories,
    list_memories,
    delete_memory,
)

app = FastAPI(title="Pi-LLaMA Memory API", version="1.0.0")

# CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class MemoryCreate(BaseModel):
    content: str
    category: Optional[str] = "general"


class MemorySearch(BaseModel):
    query: str
    limit: Optional[int] = 5


@app.get("/")
def root():
    return {"status": "ok", "service": "memory-api"}


@app.post("/memories")
async def create_memory(memory: MemoryCreate):
    """Save a new memory."""
    result = await save_memory(memory.content, memory.category)
    return result


@app.get("/memories")
def get_memories(category: Optional[str] = None, limit: int = 50):
    """List all memories."""
    return list_memories(category, limit)


@app.get("/memories/search")
async def search(q: str, limit: int = 5):
    """Semantic search for relevant memories."""
    if not q:
        raise HTTPException(status_code=400, detail="Query parameter 'q' is required")
    results = await search_memories(q, limit)
    return {"query": q, "results": results}


@app.post("/memories/search")
async def search_post(search: MemorySearch):
    """Semantic search (POST version for tool calls)."""
    results = await search_memories(search.query, search.limit)
    return {"query": search.query, "results": results}


@app.delete("/memories/{memory_id}")
def remove_memory(memory_id: int):
    """Delete a memory by ID."""
    deleted = delete_memory(memory_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Memory not found")
    return {"deleted": True, "id": memory_id}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3000)
