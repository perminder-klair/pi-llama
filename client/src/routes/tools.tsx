import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef, useEffect } from 'react'
import {
  ChatHeader,
  MessageBubble,
  ToolCallBubble,
  ToolResultBubble,
  ChatInput,
} from '@/components/chat'
import {
  createThinkingStreamState,
  processThinkingToken,
} from '@/lib/chat-utils'
import { streamChatCompletion } from '@/lib/streaming'
import { toolDefinitions, executeTool } from '@/lib/tools'
import type {
  DisplayMessage,
  BaseMessage,
  ToolCallMessage,
  ToolResultMessage,
  ChatCompletionMessage,
  ToolCall,
} from '@/lib/chat-types'
import { env } from '@/env'

export const Route = createFileRoute('/tools')({
  component: ToolsChat,
  head: () => ({
    meta: [{ title: 'Qwen3 Chat + Tools' }],
  }),
})

const SYSTEM_PROMPT = `You are Qwen3, a helpful AI assistant with access to tools. Use the available tools when appropriate to answer user questions. Be concise.

MEMORY INSTRUCTIONS:
- When the user shares personal preferences, facts about themselves, or information worth remembering, use the save_memory tool to store it.
- When you need to recall something about the user (their name, preferences, past information), use the recall_memories tool first.
- Examples of things to save: name, preferences, favorite topics, important facts they've shared.
- Always acknowledge when you've saved a memory.`

const EXAMPLE_PROMPTS = [
  { label: 'Remember me', prompt: 'My name is Alex and I prefer dark themes' },
  { label: 'Recall', prompt: 'What do you remember about me?' },
  { label: 'Weather', prompt: 'What is the weather in Tokyo?' },
]

function ToolsChat() {
  const [displayMessages, setDisplayMessages] = useState<DisplayMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const processWithTools = async (
    apiMessages: ChatCompletionMessage[]
  ): Promise<void> => {
    const maxIterations = 5

    for (let i = 0; i < maxIterations; i++) {
      try {
        const res = await fetch(`${env.VITE_API_URL}/v1/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: apiMessages,
            tools: toolDefinitions,
            max_tokens: 512,
            temperature: 0.7,
          }),
        })

        const data = await res.json()
        const choice = data.choices[0]
        const message = choice.message

        // Check for tool calls
        if (message.tool_calls && message.tool_calls.length > 0) {
          // Add assistant message with tool calls to API messages
          apiMessages.push({
            role: 'assistant',
            content: message.content || null,
            tool_calls: message.tool_calls,
          })

          // Process each tool call
          for (const toolCall of message.tool_calls as ToolCall[]) {
            const funcName = toolCall.function.name
            const funcArgs = JSON.parse(toolCall.function.arguments)

            // Display tool call
            const toolCallMsg: ToolCallMessage = {
              type: 'tool-call',
              name: funcName,
              args: funcArgs,
            }
            setDisplayMessages((prev) => [...prev, toolCallMsg])

            // Execute tool (async for memory operations)
            const result = await executeTool(funcName, funcArgs)

            // Display result
            const toolResultMsg: ToolResultMessage = {
              type: 'tool-result',
              result,
            }
            setDisplayMessages((prev) => [...prev, toolResultMsg])

            // Add tool result to API messages
            apiMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: result,
            })
          }
          // Continue loop to get final response
          continue
        }

        // No tool calls - stream the final response
        await streamFinalResponse(apiMessages)
        return
      } catch (e) {
        const errorMessage: BaseMessage = {
          role: 'bot',
          text: `Error: ${e instanceof Error ? e.message : 'Unknown error'}`,
        }
        setDisplayMessages((prev) => [...prev, errorMessage])
        return
      }
    }

    // Max iterations reached
    const errorMessage: BaseMessage = {
      role: 'bot',
      text: 'Error: Too many tool iterations',
    }
    setDisplayMessages((prev) => [...prev, errorMessage])
  }

  const streamFinalResponse = async (
    apiMessages: ChatCompletionMessage[]
  ): Promise<void> => {
    // Add empty bot message for streaming
    let botIndex = -1
    setDisplayMessages((prev) => {
      botIndex = prev.length
      return [...prev, { role: 'bot', text: '', thinking: '' } as BaseMessage]
    })

    // Wait for state to update
    await new Promise((resolve) => setTimeout(resolve, 0))

    let thinkState = createThinkingStreamState()

    // Convert to streaming format (exclude tool_calls from messages)
    const streamMessages = apiMessages.map((m) => ({
      role: m.role,
      content: m.content || '',
      ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
    }))

    await streamChatCompletion(
      {
        messages: streamMessages,
        maxTokens: 512,
        temperature: 0.7,
      },
      {
        onToken: (token) => {
          thinkState = processThinkingToken(thinkState, token)
          setDisplayMessages((prev) => {
            if (botIndex < 0 || botIndex >= prev.length) return prev
            const updated = [...prev]
            updated[botIndex] = {
              role: 'bot',
              text: thinkState.text,
              thinking: thinkState.thinking || undefined,
            } as BaseMessage
            return updated
          })
        },
        onError: (error) => {
          setDisplayMessages((prev) => {
            if (botIndex < 0 || botIndex >= prev.length) return prev
            const updated = [...prev]
            updated[botIndex] = {
              role: 'bot',
              text: `Error: ${error.message}`,
            } as BaseMessage
            return updated
          })
        },
        onComplete: () => {
          setDisplayMessages((prev) => {
            if (botIndex < 0 || botIndex >= prev.length) return prev
            const updated = [...prev]
            updated[botIndex] = {
              role: 'bot',
              text: thinkState.text.trim(),
              thinking: thinkState.thinking.trim() || undefined,
            } as BaseMessage
            return updated
          })
        },
      }
    )
  }

  const sendMessage = async () => {
    const msg = input.trim()
    if (!msg || isLoading) return

    setIsLoading(true)

    const userMessage: BaseMessage = { role: 'user', text: msg }
    setDisplayMessages((prev) => [...prev, userMessage])
    setInput('')

    // Build API messages - only user/bot messages for context
    const apiMessages: ChatCompletionMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
    ]

    // Get recent user/bot messages for context (last 6)
    const recentMsgs = displayMessages
      .filter(
        (m): m is BaseMessage =>
          'role' in m && (m.role === 'user' || m.role === 'bot')
      )
      .slice(-6)

    for (const m of recentMsgs) {
      apiMessages.push({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text,
      })
    }

    // Add current user message
    apiMessages.push({ role: 'user', content: msg })

    await processWithTools(apiMessages)

    setIsLoading(false)
    inputRef.current?.focus()
  }

  const tryExample = (prompt: string) => {
    setInput(prompt)
    inputRef.current?.focus()
  }

  // Display last 30 messages (more because tool calls take space)
  const visibleMessages = displayMessages.slice(-30)

  const renderMessage = (message: DisplayMessage, index: number) => {
    if ('type' in message) {
      if (message.type === 'tool-call') {
        return <ToolCallBubble key={index} message={message} />
      }
      if (message.type === 'tool-result') {
        return <ToolResultBubble key={index} message={message} />
      }
    }
    const isLastMessage = index === visibleMessages.length - 1
    return (
      <MessageBubble
        key={index}
        message={message as BaseMessage}
        isLoading={isLoading && isLastMessage}
      />
    )
  }

  return (
    <div className="min-h-dvh flex flex-col bg-chat-bg text-white font-[system-ui]">
      <ChatHeader modelName="Qwen3-30B-A3B" badge="TOOLS" />

      <div className="flex-1 flex flex-col justify-end p-5 overflow-y-auto">
        {visibleMessages.map(renderMessage)}
      </div>

      {/* Example prompts */}
      <div className="px-5 py-2.5 bg-chat-header-bg text-sm text-gray-500">
        Try:{' '}
        {EXAMPLE_PROMPTS.map((example, i) => (
          <span key={i}>
            <button
              onClick={() => tryExample(example.prompt)}
              className="text-gray-400 hover:text-white transition-colors cursor-pointer
                         bg-transparent border-none"
            >
              {example.label}
            </button>
            {i < EXAMPLE_PROMPTS.length - 1 && ' | '}
          </span>
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
