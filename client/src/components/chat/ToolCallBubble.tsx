import type { ToolCallMessage } from '@/lib/chat-types'

interface ToolCallBubbleProps {
  message: ToolCallMessage
}

export function ToolCallBubble({ message }: ToolCallBubbleProps) {
  return (
    <div
      className="py-4 px-5 my-2 rounded-xl max-w-[85%] break-words self-start
                    bg-chat-tool-call-bg border-l-4 border-chat-tool-call-border
                    font-mono text-base"
    >
      <div className="text-chat-tool-call-border font-bold">
        {'\u{1F527}'} {message.name}
      </div>
      <div className="text-gray-400 mt-1 text-sm whitespace-pre-wrap">
        {JSON.stringify(message.args, null, 2)}
      </div>
    </div>
  )
}
