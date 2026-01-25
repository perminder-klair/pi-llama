"""Text-to-speech service tests."""

import httpx
import pytest


class TestTextToSpeech:
    """Test TTS audio generation."""

    @pytest.mark.timeout(60)
    def test_generate_speech(self, client: httpx.Client) -> None:
        """Generate speech returns audio binary data."""
        response = client.post(
            "/tts/v1/audio/speech",
            json={
                "input": "Hello, this is a test.",
                "voice": "en_US-lessac-medium",
            },
        )
        assert response.status_code == 200
        assert len(response.content) > 0, "Audio response should not be empty"

    @pytest.mark.timeout(60)
    def test_speech_content_type(self, client: httpx.Client) -> None:
        """Generated speech has valid audio content type."""
        response = client.post(
            "/tts/v1/audio/speech",
            json={
                "input": "Testing audio format.",
                "voice": "en_US-lessac-medium",
            },
        )
        assert response.status_code == 200
        content_type = response.headers.get("content-type", "")
        # Accept common audio types
        valid_types = ["audio/", "application/octet-stream"]
        assert any(t in content_type for t in valid_types), \
            f"Expected audio content type, got: {content_type}"
