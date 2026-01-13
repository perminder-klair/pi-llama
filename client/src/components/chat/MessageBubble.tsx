import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { BaseMessage } from '@/lib/chat-types'

interface MessageBubbleProps {
  message: BaseMessage
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const [thinkingExpanded, setThinkingExpanded] = useState(false)
  const isUser = message.role === 'user'

  return (
    <div
      className={cn(
        'py-4 px-5 my-2 rounded-xl text-lg leading-relaxed max-w-[85%] break-words',
        isUser ? 'bg-chat-accent self-end ml-auto' : 'bg-chat-secondary self-start'
      )}
    >
      {isUser ? (
        <div>{message.text}</div>
      ) : (
        <ReactMarkdown className="prose prose-invert">
          {message.text}
        </ReactMarkdown>
      )}

      {message.thinking && (
        <div className="mt-2 pt-2 border-t border-chat-thinking-border">
          <button
            onClick={() => setThinkingExpanded(!thinkingExpanded)}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-400 transition-colors"
          >
            {thinkingExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            Thinking...
          </button>
          {thinkingExpanded && (
            <div className="mt-2 text-sm text-gray-500">{message.thinking}</div>
          )}
        </div>
      )}
    </div>
  )
}
