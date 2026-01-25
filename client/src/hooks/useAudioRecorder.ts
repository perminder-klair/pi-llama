import { useCallback, useEffect, useRef, useState } from 'react'

export interface AudioRecorderState {
  isRecording: boolean
  duration: number
  audioLevel: number
  error: string | null
  hasPermission: boolean | null
}

export interface AudioRecorderActions {
  startRecording: () => Promise<void>
  stopRecording: () => Promise<Blob | null>
  requestPermission: () => Promise<boolean>
}

export function useAudioRecorder(): AudioRecorderState & AudioRecorderActions {
  const [isRecording, setIsRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const [audioLevel, setAudioLevel] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Array<Blob>>([])
  const streamRef = useRef<MediaStream | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  )

  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    analyserRef.current = null
    mediaRecorderRef.current = null
    setAudioLevel(0)
    setDuration(0)
  }, [])

  useEffect(() => {
    return cleanup
  }, [cleanup])

  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(dataArray)

    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
    setAudioLevel(average / 255)

    animationFrameRef.current = requestAnimationFrame(updateAudioLevel)
  }, [])

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((track) => track.stop())
      setHasPermission(true)
      setError(null)
      return true
    } catch (err) {
      setHasPermission(false)
      setError('Microphone permission denied')
      return false
    }
  }, [])

  const startRecording = useCallback(async () => {
    try {
      setError(null)
      chunksRef.current = []

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      setHasPermission(true)

      // Set up audio analysis for level metering
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      // Determine supported MIME type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4'

      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.start(100) // Collect data every 100ms
      setIsRecording(true)
      startTimeRef.current = Date.now()

      // Update duration every 100ms
      durationIntervalRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 100)

      // Start audio level monitoring
      updateAudioLevel()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to start recording'
      setError(message)
      setHasPermission(false)
      cleanup()
    }
  }, [cleanup, updateAudioLevel])

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current

      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        cleanup()
        setIsRecording(false)
        resolve(null)
        return
      }

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type: mimeType })
        chunksRef.current = []
        cleanup()
        setIsRecording(false)
        resolve(blob)
      }

      mediaRecorder.stop()
    })
  }, [cleanup])

  return {
    isRecording,
    duration,
    audioLevel,
    error,
    hasPermission,
    startRecording,
    stopRecording,
    requestPermission,
  }
}
