import type { ToolResultMessage } from '@/lib/chat-types'

interface ToolResultBubbleProps {
  message: ToolResultMessage
}

export function ToolResultBubble({ message }: ToolResultBubbleProps) {
  return (
    <div
      className="py-4 px-5 my-2 rounded-xl max-w-[85%] break-words self-start
                    bg-chat-tool-result-bg border-l-4 border-chat-tool-result-border
                    font-mono text-base text-chat-tool-result-border"
    >
      {'\u21A9'} {message.result}
    </div>
  )
}
