import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef, useEffect } from 'react'
import { Power } from 'lucide-react'
import { cn } from '@/lib/utils'
import { streamChatCompletion } from '@/lib/streaming'

export const Route = createFileRoute('/')({
  component: Chat,
  head: () => ({
    meta: [{ title: 'Pi Chat' }],
  }),
})

interface Message {
  role: 'user' | 'bot'
  text: string
}

const SYSTEM_PROMPT =
  'You are a witty, clever assistant with a dry sense of humor. Be helpful but sneak in subtle jokes or wordplay. Keep replies brief (1-2 sentences). /no_think'

function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

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

    await streamChatCompletion(
      {
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...history,
        ],
        maxTokens: 1024,
      },
      {
        onToken: (token) => {
          setMessages((prev) => {
            const updated = [...prev]
            updated[botIndex] = {
              ...updated[botIndex],
              text: updated[botIndex].text + token,
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
        },
        onComplete: () => {
          setIsLoading(false)
        },
      }
    )
  }

  const shutdown = async () => {
    try {
      await fetch('/cgi-bin/shutdown.cgi')
    } catch {
      // Ignore - Pi is shutting down
    }
  }

  const visibleMessages = messages.slice(-10)

  return (
    <div className="min-h-dvh flex flex-col bg-chat-bg text-white font-[system-ui]">
      <button
        onClick={shutdown}
        className="fixed top-2.5 right-2.5 w-8 h-8 bg-chat-secondary rounded-full
                   flex items-center justify-center opacity-50
                   hover:opacity-100 hover:bg-red-700 transition-all cursor-pointer"
        title="Shutdown Pi"
      >
        <Power className="w-4 h-4" />
      </button>

      <div className="flex-1 flex flex-col justify-end p-5 overflow-hidden">
        {visibleMessages.map((m, i) => (
          <div
            key={i}
            className={cn(
              'p-5 my-2.5 rounded-xl text-2xl leading-relaxed',
              m.role === 'user' ? 'bg-chat-accent' : 'bg-chat-secondary'
            )}
          >
            {m.role === 'bot' && !m.text && isLoading ? (
              <span className="text-gray-500">Thinking...</span>
            ) : (
              m.text
            )}
          </div>
        ))}
      </div>

      <div className="flex p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pr-[calc(1.25rem+env(safe-area-inset-right))] bg-chat-bar">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
          className="flex-1 min-w-0 p-5 text-2xl rounded-lg border-none
                     bg-chat-secondary text-white placeholder:text-gray-400
                     focus:outline-none focus:ring-2 focus:ring-chat-accent"
        />
        <button
          onClick={sendMessage}
          disabled={isLoading}
          className="shrink-0 px-6 py-5 ml-2.5 text-2xl bg-chat-accent text-white
                     border-none rounded-lg cursor-pointer
                     hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all"
        >
          Send
        </button>
      </div>
    </div>
  )
}
