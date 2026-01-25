"""LLM service tests for chat completions and embeddings."""

import httpx
import pytest


class TestChatCompletions:
    """Test LLM chat completion endpoints."""

    @pytest.mark.timeout(120)
    def test_basic_chat_completion(self, client: httpx.Client) -> None:
        """Basic chat completion returns a valid response."""
        response = client.post(
            "/v1/chat/completions",
            json={
                "model": "qwen",
                "messages": [{"role": "user", "content": "Say hello in one word."}],
                "max_tokens": 50,
            },
        )
        assert response.status_code == 200
        data = response.json()

        assert "choices" in data
        assert len(data["choices"]) > 0
        assert "message" in data["choices"][0]
        assert "content" in data["choices"][0]["message"]
        assert len(data["choices"][0]["message"]["content"]) > 0

    @pytest.mark.timeout(120)
    def test_streaming_chat_completion(self, client: httpx.Client) -> None:
        """Streaming chat completion returns SSE tokens."""
        tokens_received = []

        with client.stream(
            "POST",
            "/v1/chat/completions",
            json={
                "model": "qwen",
                "messages": [{"role": "user", "content": "Count to 3."}],
                "max_tokens": 50,
                "stream": True,
            },
        ) as response:
            assert response.status_code == 200

            for line in response.iter_lines():
                if line.startswith("data: "):
                    data_str = line[6:]  # Remove "data: " prefix
                    if data_str.strip() == "[DONE]":
                        break
                    tokens_received.append(data_str)

        assert len(tokens_received) > 0, "Should receive at least one SSE token"


class TestEmbeddings:
    """Test embedding generation endpoint."""

    @pytest.mark.timeout(60)
    def test_generate_embeddings(self, client: httpx.Client) -> None:
        """Embeddings endpoint returns a vector."""
        response = client.post(
            "/v1/embeddings",
            json={
                "model": "qwen",
                "input": "Test embedding input",
            },
        )
        assert response.status_code == 200
        data = response.json()

        assert "data" in data
        assert len(data["data"]) > 0
        assert "embedding" in data["data"][0]

        embedding = data["data"][0]["embedding"]
        assert isinstance(embedding, list)
        assert len(embedding) > 0
        assert all(isinstance(x, (int, float)) for x in embedding)
