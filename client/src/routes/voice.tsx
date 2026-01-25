import { Link, createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Home } from 'lucide-react'
import type { VoiceName } from '@/lib/voice-api'
import { cn } from '@/lib/utils'
import { streamChatCompletion } from '@/lib/streaming'
import { synthesizeSpeech } from '@/lib/voice-api'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'
import { useSpeechToText } from '@/hooks/useSpeechToText'
import { useTextToSpeech } from '@/hooks/useTextToSpeech'
import { AudioPlayback, VoiceInput, VoiceSettings } from '@/components/voice'

export const Route = createFileRoute('/voice')({
  component: VoiceChat,
  head: () => ({
    meta: [{ title: 'Voice Chat - Pi' }],
  }),
})

interface Message {
  role: 'user' | 'bot'
  text: string
  audioBlob?: Blob
}

interface VoiceSettingsState {
  autoPlay: boolean
  voice: VoiceName
}

const STORAGE_KEY = 'voice-chat-settings'
const SYSTEM_PROMPT =
  'You are a witty, clever assistant with a dry sense of humor. Be helpful but sneak in subtle jokes or wordplay. Keep replies brief (1-2 sentences). /no_think'

function loadSettings(): VoiceSettingsState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // Ignore parse errors
  }
  return { autoPlay: true, voice: 'alloy' }
}

function saveSettings(settings: VoiceSettingsState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

function VoiceChat() {
  const [messages, setMessages] = useState<Array<Message>>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [settings, setSettings] = useState<VoiceSettingsState>(loadSettings)
  const [playingIndex, setPlayingIndex] = useState<number | null>(null)
  const [loadingTtsIndex, setLoadingTtsIndex] = useState<number | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const recorder = useAudioRecorder()
  const stt = useSpeechToText()
  const tts = useTextToSpeech()

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Save settings when they change
  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  // Stop TTS when playing index changes
  useEffect(() => {
    if (playingIndex === null) {
      tts.stop()
    }
  }, [playingIndex, tts])

  const handleStartRecording = async () => {
    await recorder.startRecording()
  }

  const handleStopRecording = async () => {
    const blob = await recorder.stopRecording()
    if (blob) {
      const text = await stt.transcribe(blob)
      if (text) {
        setInput(text)
        inputRef.current?.focus()
      }
    }
  }

  const sendMessage = async () => {
    const msg = input.trim()
    if (!msg || isLoading) return

    const newMessages = [...messages, { role: 'user' as const, text: msg }]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)

    // Add empty bot message for streaming
    const botIndex = newMessages.length
    setMessages((prev) => [...prev, { role: 'bot', text: '' }])

    const history = newMessages.slice(-4).map((m) => ({
      role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
      content: m.text,
    }))

    let fullResponse = ''

    await streamChatCompletion(
      {
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history],
        maxTokens: 1024,
      },
      {
        onToken: (token) => {
          fullResponse += token
          setMessages((prev) => {
            const updated = [...prev]
            updated[botIndex] = {
              ...updated[botIndex],
              text: fullResponse,
            }
            return updated
          })
        },
        onError: (error) => {
          setMessages((prev) => {
            const updated = [...prev]
            updated[botIndex] = {
              ...updated[botIndex],
              text: `Error: ${error.message}`,
            }
            return updated
          })
          setIsLoading(false)
        },
        onComplete: async () => {
          setIsLoading(false)

          // Auto-play TTS if enabled
          if (settings.autoPlay && fullResponse && !fullResponse.startsWith('Error:')) {
            try {
              setLoadingTtsIndex(botIndex)
              const audioBlob = await synthesizeSpeech(fullResponse, settings.voice)
              setMessages((prev) => {
                const updated = [...prev]
                updated[botIndex] = { ...updated[botIndex], audioBlob }
                return updated
              })
              setLoadingTtsIndex(null)
              setPlayingIndex(botIndex)
              await tts.playBlob(audioBlob)
              setPlayingIndex(null)
            } catch {
              setLoadingTtsIndex(null)
              setPlayingIndex(null)
            }
          }
        },
      }
    )
  }

  const handlePlayMessage = useCallback(
    async (index: number) => {
      if (index < 0 || index >= messages.length) return
      const message = messages[index]
      if (message.role !== 'bot') return

      // Stop if already playing this message
      if (playingIndex === index) {
        setPlayingIndex(null)
        return
      }

      // Stop any current playback
      tts.stop()
      setPlayingIndex(null)

      try {
        // Use cached audio blob if available
        if (message.audioBlob) {
          setPlayingIndex(index)
          await tts.playBlob(message.audioBlob)
          setPlayingIndex(null)
        } else {
          // Generate and cache TTS
          setLoadingTtsIndex(index)
          const audioBlob = await synthesizeSpeech(message.text, settings.voice)
          setMessages((prev) => {
            const updated = [...prev]
            updated[index] = { ...updated[index], audioBlob }
            return updated
          })
          setLoadingTtsIndex(null)
          setPlayingIndex(index)
          await tts.playBlob(audioBlob)
          setPlayingIndex(null)
        }
      } catch {
        setLoadingTtsIndex(null)
        setPlayingIndex(null)
      }
    },
    [messages, playingIndex, settings.voice, tts]
  )

  const handleStopPlayback = useCallback(() => {
    tts.stop()
    setPlayingIndex(null)
  }, [tts])

  const visibleMessages = messages.slice(-10)
  const visibleOffset = messages.length - visibleMessages.length

  return (
    <div className="min-h-dvh flex flex-col bg-chat-bg text-white font-[system-ui]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <Link
          to="/"
          className="w-8 h-8 rounded-full bg-chat-secondary flex items-center justify-center
                     hover:bg-chat-accent transition-colors"
          title="Back to text chat"
        >
          <Home className="w-4 h-4" />
        </Link>

        <h1 className="text-lg font-medium">Voice Chat</h1>

        <VoiceSettings
          autoPlay={settings.autoPlay}
          onAutoPlayChange={(autoPlay) =>
            setSettings((s) => ({ ...s, autoPlay }))
          }
          voice={settings.voice}
          onVoiceChange={(voice) => setSettings((s) => ({ ...s, voice }))}
        />
      </div>

      {/* Messages */}
      <div className="flex-1 flex flex-col justify-end p-5 overflow-y-auto">
        {visibleMessages.map((m, i) => {
          const actualIndex = visibleOffset + i
          return (
            <div
              key={actualIndex}
              className={cn(
                'p-5 my-2.5 rounded-xl text-xl leading-relaxed',
                m.role === 'user' ? 'bg-chat-accent' : 'bg-chat-secondary'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  {m.role === 'bot' && !m.text && isLoading ? (
                    <span className="text-gray-500">Thinking...</span>
                  ) : (
                    m.text
                  )}
                </div>

                {/* Play button for bot messages */}
                {m.role === 'bot' && m.text && !m.text.startsWith('Error:') && (
                  <AudioPlayback
                    onPlay={() => handlePlayMessage(actualIndex)}
                    onStop={handleStopPlayback}
                    isPlaying={playingIndex === actualIndex}
                    isLoading={loadingTtsIndex === actualIndex}
                    className="shrink-0 mt-1"
                  />
                )}
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Error display */}
      {(recorder.error || stt.error || tts.error) && (
        <div className="mx-5 mb-2 p-3 bg-red-900/50 text-red-200 rounded-lg text-sm">
          {recorder.error || stt.error || tts.error}
        </div>
      )}

      {/* Voice input */}
      <VoiceInput
        ref={inputRef}
        value={input}
        onChange={setInput}
        onSend={sendMessage}
        isRecording={recorder.isRecording}
        isTranscribing={stt.isTranscribing}
        isLoading={isLoading}
        duration={recorder.duration}
        audioLevel={recorder.audioLevel}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
      />
    </div>
  )
}
