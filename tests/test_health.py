"""Health check tests for all Pi-LLaMA services."""

import httpx
import pytest


class TestHealthChecks:
    """Verify all services are responding."""

    def test_gateway_responds(self, client: httpx.Client) -> None:
        """Gateway serves the React frontend."""
        response = client.get("/")
        assert response.status_code == 200
        assert "text/html" in response.headers.get("content-type", "")

    def test_llm_health(self, client: httpx.Client) -> None:
        """LLM server health endpoint works."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"

    def test_memory_api_health(self, client: httpx.Client) -> None:
        """Memory API health endpoint works."""
        response = client.get("/memory/")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        assert data.get("service") == "memory-api"
