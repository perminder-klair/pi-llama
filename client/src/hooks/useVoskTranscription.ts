import { useCallback, useEffect, useRef, useState } from 'react'

export interface VoskTranscriptionState {
  isConnected: boolean
  isListening: boolean
  partialText: string
  finalText: string
  error: string | null
}

export interface VoskTranscriptionActions {
  start: () => Promise<void>
  stop: () => void
  clearText: () => void
}

function getVoskWsUrl(): string {
  if (typeof window === 'undefined') {
    return 'ws://localhost:3080/vosk/'
  }
  return (
    import.meta.env.VITE_VOSK_WS_URL ||
    `ws://${window.location.hostname}:${window.location.port}/vosk/`
  )
}

export function useVoskTranscription(): VoskTranscriptionState &
  VoskTranscriptionActions {
  const [isConnected, setIsConnected] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [partialText, setPartialText] = useState('')
  const [finalText, setFinalText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)

  const cleanup = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setIsConnected(false)
    setIsListening(false)
  }, [])

  useEffect(() => {
    return cleanup
  }, [cleanup])

  const start = useCallback(async () => {
    try {
      setError(null)
      setPartialText('')
      setFinalText('')

      // Get microphone access
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Microphone access requires HTTPS or localhost')
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
        },
      })
      streamRef.current = stream

      // Connect to Vosk WebSocket
      const ws = new WebSocket(getVoskWsUrl())
      wsRef.current = ws

      ws.onopen = () => {
        setIsConnected(true)
        setIsListening(true)

        // Set up audio processing
        const audioContext = new AudioContext({ sampleRate: 16000 })
        audioContextRef.current = audioContext

        const source = audioContext.createMediaStreamSource(stream)
        const processor = audioContext.createScriptProcessor(4096, 1, 1)
        processorRef.current = processor

        processor.onaudioprocess = (event) => {
          if (ws.readyState !== WebSocket.OPEN) return

          const inputData = event.inputBuffer.getChannelData(0)
          // Convert Float32 to Int16
          const pcmData = new Int16Array(inputData.length)
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]))
            pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7fff
          }
          ws.send(pcmData.buffer)
        }

        source.connect(processor)
        processor.connect(audioContext.destination)
      }

      ws.onmessage = (event) => {
        try {
          const result = JSON.parse(event.data)
          if (result.partial) {
            setPartialText(result.partial)
          } else if (result.text) {
            setFinalText((prev) => {
              const newText = prev ? `${prev} ${result.text}` : result.text
              return newText.trim()
            })
            setPartialText('')
          }
        } catch {
          // Ignore parse errors
        }
      }

      ws.onerror = () => {
        setError('WebSocket connection error')
        cleanup()
      }

      ws.onclose = () => {
        setIsConnected(false)
        setIsListening(false)
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to start transcription'
      setError(message)
      cleanup()
    }
  }, [cleanup])

  const stop = useCallback(() => {
    // Send EOF to Vosk before closing
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send('{"eof" : 1}')
    }
    cleanup()
  }, [cleanup])

  const clearText = useCallback(() => {
    setPartialText('')
    setFinalText('')
  }, [])

  return {
    isConnected,
    isListening,
    partialText,
    finalText,
    error,
    start,
    stop,
    clearText,
  }
}
