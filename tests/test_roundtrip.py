"""Round-trip tests verifying service integration."""

import httpx
import pytest


class TestTTSWhisperRoundtrip:
    """Test TTS to Whisper round-trip conversion."""

    @pytest.mark.timeout(180)
    def test_tts_to_whisper_roundtrip(self, client: httpx.Client) -> None:
        """Generate speech with TTS, transcribe with Whisper, verify text matches."""
        original_text = "The quick brown fox"

        # Step 1: Generate speech from text
        tts_response = client.post(
            "/tts/v1/audio/speech",
            json={
                "input": original_text,
                "voice": "en_US-lessac-medium",
            },
        )
        assert tts_response.status_code == 200
        audio_data = tts_response.content
        assert len(audio_data) > 0, "TTS should return audio data"

        # Step 2: Transcribe the generated audio
        whisper_response = client.post(
            "/whisper/asr",
            files={"audio_file": ("test.wav", audio_data, "audio/wav")},
            params={"output": "json"},
        )
        assert whisper_response.status_code == 200

        # Step 3: Verify transcription contains key words
        result = whisper_response.json()
        transcribed_text = result.get("text", str(result)).lower()

        # Check that key words from original text appear in transcription
        # Using fuzzy matching since exact transcription may vary
        key_words = ["quick", "brown", "fox"]
        matches = sum(1 for word in key_words if word in transcribed_text)

        assert matches >= 2, \
            f"Expected at least 2 key words in transcription. " \
            f"Original: '{original_text}', Transcribed: '{transcribed_text}'"
