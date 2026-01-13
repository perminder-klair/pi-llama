import { forwardRef } from 'react'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  isLoading: boolean
  placeholder?: string
}

export const ChatInput = forwardRef<HTMLInputElement, ChatInputProps>(
  (
    { value, onChange, onSend, isLoading, placeholder = 'Type a message...' },
    ref
  ) => {
    return (
      <div
        className="flex gap-2.5 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]
                      pr-[calc(1.25rem+env(safe-area-inset-right))] bg-chat-bar"
      >
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && onSend()}
          placeholder={placeholder}
          className="flex-1 min-w-0 py-4 px-5 text-lg rounded-lg border-none
                     bg-chat-secondary text-white placeholder:text-gray-400
                     focus:outline-none focus:ring-2 focus:ring-chat-accent"
        />
        <button
          onClick={onSend}
          disabled={isLoading}
          className="shrink-0 px-6 py-4 text-lg bg-chat-accent text-white
                     border-none rounded-lg cursor-pointer
                     hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all"
        >
          Send
        </button>
      </div>
    )
  }
)
ChatInput.displayName = 'ChatInput'
