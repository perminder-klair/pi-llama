import { env } from '@/env'

export interface StreamCallbacks {
  onToken: (token: string) => void
  onComplete?: () => void
  onError?: (error: Error) => void
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_call_id?: string
}

export interface StreamOptions {
  messages: ChatMessage[]
  maxTokens?: number
  temperature?: number
}

/**
 * Parse a single SSE line into delta content
 * Format: data: {"choices":[{"delta":{"content":"token"}}]}
 */
export function parseSSELine(line: string): string | null {
  if (!line.startsWith('data: ')) return null

  const data = line.slice(6) // Remove 'data: ' prefix
  if (data === '[DONE]') return null

  try {
    const parsed = JSON.parse(data)
    return parsed.choices?.[0]?.delta?.content ?? null
  } catch {
    return null
  }
}

/**
 * Stream chat completion from the API
 */
export async function streamChatCompletion(
  options: StreamOptions,
  callbacks: StreamCallbacks
): Promise<void> {
  const { messages, maxTokens = 1024, temperature = 0.7 } = options
  const { onToken, onComplete, onError } = callbacks

  try {
    const res = await fetch(`${env.VITE_API_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        max_tokens: maxTokens,
        temperature,
        stream: true,
      }),
    })

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    }

    const reader = res.body?.getReader()
    if (!reader) {
      throw new Error('No response body')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // Process complete lines
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? '' // Keep incomplete line in buffer

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue

        const token = parseSSELine(trimmed)
        if (token) {
          onToken(token)
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim()) {
      const token = parseSSELine(buffer.trim())
      if (token) {
        onToken(token)
      }
    }

    onComplete?.()
  } catch (e) {
    const error = e instanceof Error ? e : new Error('Unknown error')
    onError?.(error)
  }
}
