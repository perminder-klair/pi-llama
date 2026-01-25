import { useCallback, useEffect, useRef, useState } from 'react'
import type { VoiceName } from '@/lib/voice-api'
import { synthesizeSpeech } from '@/lib/voice-api'

export interface TextToSpeechState {
  isSpeaking: boolean
  isLoading: boolean
  error: string | null
}

export interface TextToSpeechActions {
  speak: (text: string, voice?: VoiceName) => Promise<void>
  stop: () => void
  playBlob: (blob: Blob) => Promise<void>
  clearError: () => void
}

export function useTextToSpeech(): TextToSpeechState & TextToSpeechActions {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }, [])

  useEffect(() => {
    return cleanup
  }, [cleanup])

  const playBlob = useCallback(
    async (blob: Blob): Promise<void> => {
      cleanup()

      const url = URL.createObjectURL(blob)
      objectUrlRef.current = url

      const audio = new Audio(url)
      audioRef.current = audio

      return new Promise((resolve, reject) => {
        audio.onended = () => {
          setIsSpeaking(false)
          resolve()
        }
        audio.onerror = () => {
          setIsSpeaking(false)
          reject(new Error('Audio playback failed'))
        }
        audio.onplay = () => {
          setIsSpeaking(true)
        }

        audio.play().catch(reject)
      })
    },
    [cleanup]
  )

  const speak = useCallback(
    async (text: string, voice: VoiceName = 'alloy'): Promise<void> => {
      setError(null)
      setIsLoading(true)

      try {
        const blob = await synthesizeSpeech(text, voice)
        setIsLoading(false)
        await playBlob(blob)
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Speech synthesis failed'
        setError(message)
        setIsLoading(false)
        setIsSpeaking(false)
      }
    },
    [playBlob]
  )

  const stop = useCallback(() => {
    cleanup()
    setIsSpeaking(false)
  }, [cleanup])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    isSpeaking,
    isLoading,
    error,
    speak,
    stop,
    playBlob,
    clearError,
  }
}
