import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef, useEffect, useCallback } from 'react'
import { ToolCallBubble, ToolResultBubble } from '@/components/chat'
import { AudioPlayback, VoiceInput, VoiceSettings } from '@/components/voice'
import {
  createThinkingStreamState,
  processThinkingToken,
} from '@/lib/chat-utils'
import { cn } from '@/lib/utils'
import { streamChatCompletion } from '@/lib/streaming'
import { synthesizeSpeech } from '@/lib/voice-api'
import { toolDefinitions, executeTool } from '@/lib/tools'
import type {
  BaseMessage,
  ToolCallMessage,
  ToolResultMessage,
  ChatCompletionMessage,
  ToolCall,
} from '@/lib/chat-types'
import type { VoiceName } from '@/lib/voice-api'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'
import { useSpeechToText } from '@/hooks/useSpeechToText'
import { useTextToSpeech } from '@/hooks/useTextToSpeech'
import { env } from '@/env'

export const Route = createFileRoute('/')({
  component: Chat,
  head: () => ({
    meta: [{ title: 'Llama Chat' }],
  }),
})

// Extended BaseMessage with audio blob for TTS caching
interface VoiceMessage extends BaseMessage {
  audioBlob?: Blob
}

type ExtendedDisplayMessage =
  | VoiceMessage
  | ToolCallMessage
  | ToolResultMessage

interface VoiceSettingsState {
  autoPlay: boolean
  voice: VoiceName
}

const STORAGE_KEY = 'voice-chat-settings'

const SYSTEM_PROMPT = `You are Qwen3, a helpful AI assistant with access to tools. Use the available tools when appropriate to answer user questions. Keep responses concise and conversational.

MEMORY INSTRUCTIONS:
- When the user shares personal preferences, facts about themselves, or information worth remembering, use the save_memory tool to store it.
- When you need to recall something about the user (their name, preferences, past information), use the recall_memories tool first.
- Examples of things to save: name, preferences, favorite topics, important facts they've shared.
- Always acknowledge when you've saved a memory. /no_think`

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

function Chat() {
  // Messages (tool-aware with voice support)
  const [displayMessages, setDisplayMessages] = useState<
    ExtendedDisplayMessage[]
  >([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Voice settings
  const [settings, setSettings] = useState<VoiceSettingsState>(loadSettings)
  const [playingIndex, setPlayingIndex] = useState<number | null>(null)
  const [loadingTtsIndex, setLoadingTtsIndex] = useState<number | null>(null)

  // Refs
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Voice hooks
  const recorder = useAudioRecorder()
  const stt = useSpeechToText()
  const tts = useTextToSpeech()

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [displayMessages])

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

  // Voice recording handlers
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

  // Process with tools - returns when done
  const processWithTools = async (
    apiMessages: ChatCompletionMessage[],
    botIndex: number
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

          // Remove the placeholder bot message before adding tool calls
          setDisplayMessages((prev) => {
            const updated = [...prev]
            // Remove the empty bot message at botIndex
            if (botIndex < updated.length && 'role' in updated[botIndex]) {
              const msg = updated[botIndex] as VoiceMessage
              if (msg.role === 'bot' && !msg.text) {
                updated.splice(botIndex, 1)
              }
            }
            return updated
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

            // Execute tool
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

          // Add new placeholder for next response
          let newBotIndex = -1
          setDisplayMessages((prev) => {
            newBotIndex = prev.length
            return [
              ...prev,
              { role: 'bot', text: '', thinking: '' } as VoiceMessage,
            ]
          })
          await new Promise((resolve) => setTimeout(resolve, 0))
          botIndex = newBotIndex

          // Continue loop to get final response
          continue
        }

        // No tool calls - stream the final response using existing botIndex
        await streamFinalResponse(apiMessages, botIndex)
        return
      } catch (e) {
        setDisplayMessages((prev) => {
          if (botIndex < 0 || botIndex >= prev.length) return prev
          const updated = [...prev]
          updated[botIndex] = {
            role: 'bot',
            text: `Error: ${e instanceof Error ? e.message : 'Unknown error'}`,
          } as VoiceMessage
          return updated
        })
        return
      }
    }

    // Max iterations reached
    setDisplayMessages((prev) => {
      if (botIndex < 0 || botIndex >= prev.length) return prev
      const updated = [...prev]
      updated[botIndex] = {
        role: 'bot',
        text: 'Error: Too many tool iterations',
      } as VoiceMessage
      return updated
    })
  }

  // Stream final response with thinking tag support
  const streamFinalResponse = async (
    apiMessages: ChatCompletionMessage[],
    botIndex: number
  ): Promise<void> => {
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
            } as VoiceMessage
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
            } as VoiceMessage
            return updated
          })
        },
        onComplete: async () => {
          const finalText = thinkState.text.trim()
          setDisplayMessages((prev) => {
            if (botIndex < 0 || botIndex >= prev.length) return prev
            const updated = [...prev]
            updated[botIndex] = {
              role: 'bot',
              text: finalText,
              thinking: thinkState.thinking.trim() || undefined,
            } as VoiceMessage
            return updated
          })

          // Auto-play TTS if enabled
          if (
            settings.autoPlay &&
            finalText &&
            !finalText.startsWith('Error:')
          ) {
            try {
              setLoadingTtsIndex(botIndex)
              const audioBlob = await synthesizeSpeech(finalText, settings.voice)
              setDisplayMessages((prev) => {
                if (botIndex < 0 || botIndex >= prev.length) return prev
                const updated = [...prev]
                const msg = updated[botIndex] as VoiceMessage
                updated[botIndex] = { ...msg, audioBlob }
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

  const sendMessage = async () => {
    const msg = input.trim()
    if (!msg || isLoading) return

    setIsLoading(true)

    // Add user message and empty bot message for immediate "Thinking..." display
    let botIndex = -1
    setDisplayMessages((prev) => {
      botIndex = prev.length + 1 // +1 because user message is added first
      return [
        ...prev,
        { role: 'user', text: msg } as VoiceMessage,
        { role: 'bot', text: '', thinking: '' } as VoiceMessage,
      ]
    })
    setInput('')

    // Wait for state to update
    await new Promise((resolve) => setTimeout(resolve, 0))

    // Build API messages - only user/bot messages for context
    const apiMessages: ChatCompletionMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
    ]

    // Get recent user/bot messages for context (last 6, excluding the empty bot message we just added)
    const recentMsgs = displayMessages
      .filter(
        (m): m is VoiceMessage =>
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

    await processWithTools(apiMessages, botIndex)

    setIsLoading(false)
    inputRef.current?.focus()
  }

  // TTS playback handlers
  const handlePlayMessage = useCallback(
    async (index: number) => {
      if (index < 0 || index >= displayMessages.length) return
      const message = displayMessages[index]
      if (!('role' in message) || message.role !== 'bot') return

      // Stop if already playing this message
      if (playingIndex === index) {
        setPlayingIndex(null)
        return
      }

      // Stop any current playback
      tts.stop()
      setPlayingIndex(null)

      try {
        const voiceMsg = message as VoiceMessage
        // Use cached audio blob if available
        if (voiceMsg.audioBlob) {
          setPlayingIndex(index)
          await tts.playBlob(voiceMsg.audioBlob)
          setPlayingIndex(null)
        } else {
          // Generate and cache TTS
          setLoadingTtsIndex(index)
          const audioBlob = await synthesizeSpeech(voiceMsg.text, settings.voice)
          setDisplayMessages((prev) => {
            const updated = [...prev]
            const msg = updated[index] as VoiceMessage
            updated[index] = { ...msg, audioBlob }
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
    [displayMessages, playingIndex, settings.voice, tts]
  )

  const handleStopPlayback = useCallback(() => {
    tts.stop()
    setPlayingIndex(null)
  }, [tts])

  // Display last 30 messages (more because tool calls take space)
  const visibleMessages = displayMessages.slice(-30)
  const visibleOffset = displayMessages.length - visibleMessages.length

  const renderMessage = (message: ExtendedDisplayMessage, index: number) => {
    const actualIndex = visibleOffset + index

    if ('type' in message) {
      if (message.type === 'tool-call') {
        return <ToolCallBubble key={actualIndex} message={message} />
      }
      if (message.type === 'tool-result') {
        return <ToolResultBubble key={actualIndex} message={message} />
      }
    }

    const baseMsg = message as VoiceMessage
    const isLastMessage = index === visibleMessages.length - 1

    return (
      <div
        key={actualIndex}
        className={cn(
          'p-5 my-2.5 rounded-xl text-xl leading-relaxed',
          baseMsg.role === 'user' ? 'bg-chat-accent' : 'bg-chat-secondary'
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            {baseMsg.role === 'bot' && !baseMsg.text && isLoading && isLastMessage ? (
              <span className="text-gray-500">Thinking...</span>
            ) : (
              baseMsg.text
            )}
          </div>

          {/* Play button for bot messages */}
          {baseMsg.role === 'bot' &&
            baseMsg.text &&
            !baseMsg.text.startsWith('Error:') && (
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
  }

  return (
    <div className="min-h-dvh flex flex-col bg-chat-bg text-white font-[system-ui]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="w-8" /> {/* Spacer for centering */}
        <h1 className="text-lg font-medium">Llama Chat</h1>
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
        {visibleMessages.map(renderMessage)}
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
