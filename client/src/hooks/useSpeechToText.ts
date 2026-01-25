import { useCallback, useState } from 'react'
import { transcribeAudio } from '@/lib/voice-api'

export interface SpeechToTextState {
  isTranscribing: boolean
  error: string | null
}

export interface SpeechToTextActions {
  transcribe: (blob: Blob) => Promise<string | null>
  clearError: () => void
}

export function useSpeechToText(): SpeechToTextState & SpeechToTextActions {
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const transcribe = useCallback(
    async (blob: Blob): Promise<string | null> => {
      setError(null)
      setIsTranscribing(true)

      try {
        const text = await transcribeAudio(blob)
        return text
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Transcription failed'
        setError(message)
        return null
      } finally {
        setIsTranscribing(false)
      }
    },
    []
  )

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    isTranscribing,
    error,
    transcribe,
    clearError,
  }
}
