import { env } from '@/env'

export type VoiceName = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'

/**
 * Transcribe audio using Whisper API
 */
export async function transcribeAudio(blob: Blob): Promise<string> {
  const formData = new FormData()
  formData.append('audio_file', blob, 'recording.webm')

  const res = await fetch(`${env.VITE_API_URL}/whisper/asr`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    throw new Error(`Transcription failed: ${res.status} ${res.statusText}`)
  }

  const text = await res.text()
  return text.trim()
}

/**
 * Synthesize speech using Piper TTS API
 */
export async function synthesizeSpeech(
  text: string,
  voice: VoiceName = 'alloy'
): Promise<Blob> {
  const res = await fetch(`${env.VITE_API_URL}/tts/v1/audio/speech`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'tts-1',
      input: text,
      voice,
      response_format: 'mp3',
    }),
  })

  if (!res.ok) {
    throw new Error(`Speech synthesis failed: ${res.status} ${res.statusText}`)
  }

  return res.blob()
}
