import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef, useEffect } from 'react'
import { ChatHeader, MessageBubble, ChatInput } from '@/components/chat'
import { parseThinkingTags } from '@/lib/chat-utils'
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

    try {
      // Send last 6 messages as context
      const history = newMessages.slice(-6).map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text,
      }))

      const res = await fetch('/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history],
          max_tokens: 512,
          temperature: 0.7,
        }),
      })

      const data = await res.json()
      const rawReply = data.choices[0].message.content

      // Parse thinking tags
      const { text, thinking } = parseThinkingTags(rawReply)

      setMessages((prev) => [...prev, { role: 'bot', text, thinking }])
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text: `Error: ${e instanceof Error ? e.message : 'Unknown error'}`,
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  // Display last 20 messages
  const visibleMessages = messages.slice(-20)

  return (
    <div className="min-h-dvh flex flex-col bg-chat-bg text-white font-[system-ui]">
      <ChatHeader modelName="Qwen3-30B-A3B" />

      <div className="flex-1 flex flex-col justify-end p-5 overflow-y-auto">
        {visibleMessages.map((m, i) => (
          <MessageBubble key={i} message={m} />
        ))}
        {isLoading && (
          <div
            className="text-gray-500 text-lg py-4 px-5 bg-chat-secondary/50
                          rounded-xl my-2 self-start"
          >
            Thinking...
          </div>
        )}
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
