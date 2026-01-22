"""SQLite database with vector similarity search for memories."""

import sqlite3
import json
import os
import numpy as np
from pathlib import Path
from datetime import datetime
from typing import Optional
import httpx

# Database path - use /app/data in Docker, local otherwise
DATA_DIR = Path(os.getenv("DATA_DIR", Path(__file__).parent))
DB_PATH = DATA_DIR / "memories.db"

# llama-server embedding endpoint
LLAMA_SERVER_URL = os.getenv("LLAMA_SERVER_URL", "http://localhost:5000")
EMBEDDING_URL = f"{LLAMA_SERVER_URL}/embedding"


def get_connection() -> sqlite3.Connection:
    """Get SQLite connection with row factory."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initialize the database schema."""
    conn = get_connection()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS memories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT NOT NULL,
            category TEXT DEFAULT 'general',
            embedding BLOB,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_category ON memories(category)")
    conn.commit()
    conn.close()


async def get_embedding(text: str) -> Optional[list[float]]:
    """Get embedding vector from llama-server."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                EMBEDDING_URL,
                json={"content": text}
            )
            if response.status_code == 200:
                data = response.json()
                # llama-server returns [{"index": 0, "embedding": [[...]]}]
                if isinstance(data, list) and len(data) > 0:
                    embedding = data[0].get("embedding")
                    # Handle nested [[...]] format
                    if isinstance(embedding, list) and len(embedding) > 0 and isinstance(embedding[0], list):
                        return embedding[0]
                    return embedding
                # Fallback for simple {"embedding": [...]} format
                return data.get("embedding")
            return None
    except Exception as e:
        print(f"Embedding error: {e}")
        return None


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Calculate cosine similarity between two vectors."""
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))


async def save_memory(content: str, category: str = "general") -> dict:
    """Save a new memory with its embedding."""
    embedding = await get_embedding(content)

    now = datetime.utcnow().isoformat()
    conn = get_connection()

    cursor = conn.execute(
        """
        INSERT INTO memories (content, category, embedding, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            content,
            category,
            json.dumps(embedding) if embedding else None,
            now,
            now
        )
    )

    memory_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return {
        "id": memory_id,
        "content": content,
        "category": category,
        "created_at": now,
        "has_embedding": embedding is not None
    }


async def search_memories(query: str, limit: int = 5, threshold: float = 0.3) -> list[dict]:
    """Search memories using semantic similarity."""
    query_embedding = await get_embedding(query)

    conn = get_connection()
    rows = conn.execute("SELECT * FROM memories WHERE embedding IS NOT NULL").fetchall()
    conn.close()

    if not query_embedding or not rows:
        # Fallback to text search if no embedding
        return text_search_memories(query, limit)

    query_vec = np.array(query_embedding)

    results = []
    for row in rows:
        stored_embedding = json.loads(row["embedding"])
        stored_vec = np.array(stored_embedding)

        similarity = cosine_similarity(query_vec, stored_vec)

        if similarity >= threshold:
            results.append({
                "id": row["id"],
                "content": row["content"],
                "category": row["category"],
                "similarity": round(similarity, 4),
                "created_at": row["created_at"]
            })

    # Sort by similarity descending
    results.sort(key=lambda x: x["similarity"], reverse=True)
    return results[:limit]


def text_search_memories(query: str, limit: int = 5) -> list[dict]:
    """Fallback text search for memories."""
    conn = get_connection()
    # Simple LIKE search
    rows = conn.execute(
        """
        SELECT * FROM memories
        WHERE content LIKE ?
        ORDER BY created_at DESC
        LIMIT ?
        """,
        (f"%{query}%", limit)
    ).fetchall()
    conn.close()

    return [
        {
            "id": row["id"],
            "content": row["content"],
            "category": row["category"],
            "similarity": 0.5,  # Default score for text match
            "created_at": row["created_at"]
        }
        for row in rows
    ]


def list_memories(category: Optional[str] = None, limit: int = 50) -> list[dict]:
    """List all memories, optionally filtered by category."""
    conn = get_connection()

    if category:
        rows = conn.execute(
            "SELECT * FROM memories WHERE category = ? ORDER BY created_at DESC LIMIT ?",
            (category, limit)
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM memories ORDER BY created_at DESC LIMIT ?",
            (limit,)
        ).fetchall()

    conn.close()

    return [
        {
            "id": row["id"],
            "content": row["content"],
            "category": row["category"],
            "created_at": row["created_at"]
        }
        for row in rows
    ]


def delete_memory(memory_id: int) -> bool:
    """Delete a memory by ID."""
    conn = get_connection()
    cursor = conn.execute("DELETE FROM memories WHERE id = ?", (memory_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted


# Initialize database on module import
init_db()
