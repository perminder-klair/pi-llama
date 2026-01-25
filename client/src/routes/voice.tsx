import { Link, createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { Home } from 'lucide-react'
import { cn } from '@/lib/utils'
import { streamChatCompletion } from '@/lib/streaming'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'
import { useSpeechToText } from '@/hooks/useSpeechToText'
import { useVoskTranscription } from '@/hooks/useVoskTranscription'
import { VoiceInput } from '@/components/voice'

export const Route = createFileRoute('/voice')({
  component: VoiceChat,
  head: () => ({
    meta: [{ title: 'Voice Chat - Pi' }],
  }),
})

interface Message {
  role: 'user' | 'bot'
  text: string
}

const SYSTEM_PROMPT =
  'You are a witty, clever assistant with a dry sense of humor. Be helpful but sneak in subtle jokes or wordplay. Keep replies brief (1-2 sentences). /no_think'

function VoiceChat() {
  const [messages, setMessages] = useState<Array<Message>>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const recorder = useAudioRecorder()
  const stt = useSpeechToText()
  const vosk = useVoskTranscription()

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleStartRecording = async () => {
    vosk.clearText()
    await Promise.all([recorder.startRecording(), vosk.start()])
  }

  const handleStopRecording = async () => {
    const blob = await recorder.stopRecording()
    vosk.stop()

    // Use Vosk's final text if available, otherwise fall back to Whisper
    const voskText = vosk.finalText.trim()
    if (voskText) {
      setInput(voskText)
      inputRef.current?.focus()
    } else if (blob) {
      // Fallback to Whisper for better accuracy on short recordings
      const text = await stt.transcribe(blob)
      if (text) {
        setInput(text)
        inputRef.current?.focus()
      }
    }
  }

  // Show live transcription preview while recording
  const displayText = recorder.isRecording
    ? vosk.partialText || vosk.finalText || input
    : input

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
        onComplete: () => {
          setIsLoading(false)
        },
      }
    )
  }

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

        <div className="w-8" />
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
              {m.role === 'bot' && !m.text && isLoading ? (
                <span className="text-gray-500">Thinking...</span>
              ) : (
                m.text
              )}
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Error display */}
      {(recorder.error || stt.error || vosk.error) && (
        <div className="mx-5 mb-2 p-3 bg-red-900/50 text-red-200 rounded-lg text-sm">
          {recorder.error || stt.error || vosk.error}
        </div>
      )}

      {/* Voice input */}
      <VoiceInput
        ref={inputRef}
        value={displayText}
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
