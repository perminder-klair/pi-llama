// Message types for the chat system
export interface BaseMessage {
  role: 'user' | 'bot'
  text: string
  thinking?: string | null
}

export interface ToolCallMessage {
  type: 'tool-call'
  name: string
  args: Record<string, unknown>
}

export interface ToolResultMessage {
  type: 'tool-result'
  result: string
}

export type DisplayMessage = BaseMessage | ToolCallMessage | ToolResultMessage

// API types
export interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls?: ToolCall[]
  tool_call_id?: string
}

export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, unknown>
      required?: string[]
    }
  }
}
