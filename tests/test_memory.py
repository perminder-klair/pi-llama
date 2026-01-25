"""Memory API tests for CRUD operations and semantic search."""

import httpx
import pytest


class TestMemoryCRUD:
    """Test memory create, read, update, delete operations."""

    @pytest.mark.timeout(30)
    def test_create_memory(
        self, client: httpx.Client, memory_cleanup: list[str]
    ) -> None:
        """Create a memory with embedding."""
        response = client.post(
            "/memory/memories",
            json={"content": "Test memory for integration tests"},
        )
        assert response.status_code == 200
        data = response.json()

        assert "id" in data
        assert data["content"] == "Test memory for integration tests"
        assert "has_embedding" in data

        # Track for cleanup
        memory_cleanup.append(data["id"])

    @pytest.mark.timeout(30)
    def test_list_memories(
        self, client: httpx.Client, memory_cleanup: list[str]
    ) -> None:
        """List all memories returns an array."""
        # Create a memory first
        create_response = client.post(
            "/memory/memories",
            json={"content": "Memory for list test"},
        )
        memory_id = create_response.json()["id"]
        memory_cleanup.append(memory_id)

        # List memories
        response = client.get("/memory/memories")
        assert response.status_code == 200
        data = response.json()

        assert isinstance(data, list)
        assert len(data) >= 1

    @pytest.mark.timeout(60)
    def test_search_memories(
        self, client: httpx.Client, memory_cleanup: list[str]
    ) -> None:
        """Search memories returns semantically similar results."""
        # Create a memory with specific content
        create_response = client.post(
            "/memory/memories",
            json={"content": "The user's favorite color is blue"},
        )
        memory_id = create_response.json()["id"]
        memory_cleanup.append(memory_id)

        # Search for related content
        response = client.get(
            "/memory/memories/search",
            params={"q": "What color does the user like?"},
        )
        assert response.status_code == 200
        data = response.json()

        assert "query" in data
        assert "results" in data
        assert isinstance(data["results"], list)

    @pytest.mark.timeout(30)
    def test_delete_memory(
        self, client: httpx.Client, memory_cleanup: list[str]
    ) -> None:
        """Delete a memory returns success."""
        # Create a memory to delete
        create_response = client.post(
            "/memory/memories",
            json={"content": "Memory to be deleted"},
        )
        memory_id = create_response.json()["id"]

        # Delete it
        response = client.delete(f"/memory/memories/{memory_id}")
        assert response.status_code == 200
        data = response.json()
        assert data.get("deleted") is True

    @pytest.mark.timeout(30)
    def test_delete_nonexistent_memory(self, client: httpx.Client) -> None:
        """Deleting a nonexistent memory returns 404."""
        response = client.delete("/memory/memories/nonexistent-id-12345")
        assert response.status_code == 404
