interface ChatHeaderProps {
  modelName: string
  badge?: string
}

export function ChatHeader({ modelName, badge }: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between px-5 py-4 bg-chat-header-bg border-b border-chat-secondary">
      <span className="text-xl font-medium text-gray-400">{modelName}</span>
      {badge && (
        <span className="px-2.5 py-1 text-sm rounded bg-chat-tool-call-bg text-chat-tool-call-border">
          {badge}
        </span>
      )}
    </div>
  )
}
