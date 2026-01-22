import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef, useEffect } from 'react'
import { ChatHeader, MessageBubble, ChatInput } from '@/components/chat'
import {
  createThinkingStreamState,
  processThinkingToken,
} from '@/lib/chat-utils'
import { streamChatCompletion } from '@/lib/streaming'
import type { BaseMessage } from '@/lib/chat-types'

export const Route = createFileRoute('/qwen3')({
  component: Qwen3Chat,
  head: () => ({
    meta: [{ title: 'Qwen3 Chat' }],
  }),
})

const SYSTEM_PROMPT =
  'You are Qwen3, a helpful and knowledgeable AI assistant. You excel at reasoning, coding, math, and creative tasks. Be helpful, accurate, and concise.'

function Qwen3Chat() {
  const [messages, setMessages] = useState<BaseMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const sendMessage = async () => {
    const msg = input.trim()
    if (!msg || isLoading) return

    const newMessages: BaseMessage[] = [
      ...messages,
      { role: 'user', text: msg },
    ]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)

    // Add empty bot message for streaming
    const botIndex = newMessages.length
    setMessages((prev) => [...prev, { role: 'bot', text: '', thinking: '' }])

    // Send last 6 messages as context
    const history = newMessages.slice(-6).map((m) => ({
      role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
      content: m.text,
    }))

    // Track thinking stream state
    let thinkState = createThinkingStreamState()

    await streamChatCompletion(
      {
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history],
        maxTokens: 512,
        temperature: 0.7,
      },
      {
        onToken: (token) => {
          thinkState = processThinkingToken(thinkState, token)
          setMessages((prev) => {
            const updated = [...prev]
            updated[botIndex] = {
              ...updated[botIndex],
              text: thinkState.text,
              thinking: thinkState.thinking || undefined,
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
          // Trim final content
          setMessages((prev) => {
            const updated = [...prev]
            updated[botIndex] = {
              ...updated[botIndex],
              text: thinkState.text.trim(),
              thinking: thinkState.thinking.trim() || undefined,
            }
            return updated
          })
          setIsLoading(false)
        },
      }
    )
  }

  // Display last 20 messages
  const visibleMessages = messages.slice(-20)

  return (
    <div className="min-h-dvh flex flex-col bg-chat-bg text-white font-[system-ui]">
      <ChatHeader modelName="Qwen3-30B-A3B" />

      <div className="flex-1 flex flex-col justify-end p-5 overflow-y-auto">
        {visibleMessages.map((m, i) => (
          <MessageBubble
            key={i}
            message={m}
            isLoading={isLoading && i === visibleMessages.length - 1}
          />
        ))}
      </div>

      <ChatInput
        ref={inputRef}
        value={input}
        onChange={setInput}
        onSend={sendMessage}
        isLoading={isLoading}
      />
    </div>
  )
}
