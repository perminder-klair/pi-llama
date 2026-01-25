"""Speech-to-text (Whisper) service tests."""

import httpx
import pytest


class TestWhisper:
    """Test Whisper transcription service."""

    @pytest.mark.timeout(120)
    def test_transcribe_audio(self, client: httpx.Client) -> None:
        """Transcribe audio returns text.

        This test first generates audio via TTS, then transcribes it.
        """
        # Generate audio to transcribe
        tts_response = client.post(
            "/tts/v1/audio/speech",
            json={
                "input": "Hello world",
                "voice": "en_US-lessac-medium",
            },
        )
        assert tts_response.status_code == 200
        audio_data = tts_response.content

        # Transcribe the audio
        response = client.post(
            "/whisper/asr",
            files={"audio_file": ("test.wav", audio_data, "audio/wav")},
            params={"output": "json"},
        )
        assert response.status_code == 200
        data = response.json()

        # Response should contain transcription text
        assert "text" in data or isinstance(data, str), \
            f"Expected transcription text in response: {data}"
