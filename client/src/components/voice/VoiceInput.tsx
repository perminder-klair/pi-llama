import { forwardRef } from 'react'
import { Loader2, Mic, Send, Square } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VoiceInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  isRecording: boolean
  isTranscribing: boolean
  isLoading: boolean
  duration: number
  audioLevel: number
  onStartRecording: () => void
  onStopRecording: () => void
  placeholder?: string
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export const VoiceInput = forwardRef<HTMLInputElement, VoiceInputProps>(
  (
    {
      value,
      onChange,
      onSend,
      isRecording,
      isTranscribing,
      isLoading,
      duration,
      audioLevel,
      onStartRecording,
      onStopRecording,
      placeholder = 'Tap mic to record or type...',
    },
    ref
  ) => {
    const handleMicClick = () => {
      if (isRecording) {
        onStopRecording()
      } else {
        onStartRecording()
      }
    }

    const canSend = value.trim() && !isLoading && !isRecording && !isTranscribing

    return (
      <div
        className="flex flex-col gap-2 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]
                   pr-[calc(1.25rem+env(safe-area-inset-right))] bg-chat-bar"
      >
        {/* Recording indicator */}
        {isRecording && (
          <div className="flex items-center gap-3 px-2 text-sm text-gray-300">
            <span
              className="w-3 h-3 rounded-full bg-red-500 animate-pulse"
              style={{
                transform: `scale(${1 + audioLevel * 0.5})`,
                transition: 'transform 0.1s ease-out',
              }}
            />
            <span>Recording... {formatDuration(duration)}</span>
          </div>
        )}

        {/* Transcribing indicator */}
        {isTranscribing && (
          <div className="flex items-center gap-3 px-2 text-sm text-gray-300">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Transcribing...</span>
          </div>
        )}

        {/* Input row */}
        <div className="flex gap-2.5">
          {/* Mic button */}
          <button
            onClick={handleMicClick}
            disabled={isTranscribing || isLoading}
            className={cn(
              'shrink-0 w-14 h-14 rounded-full flex items-center justify-center',
              'transition-all disabled:opacity-50 disabled:cursor-not-allowed',
              isRecording
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-chat-secondary hover:bg-chat-accent'
            )}
            title={isRecording ? 'Stop recording' : 'Start recording'}
          >
            {isRecording ? (
              <Square className="w-5 h-5 fill-current" />
            ) : (
              <Mic className="w-6 h-6" />
            )}
          </button>

          {/* Text input */}
          <input
            ref={ref}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && canSend && onSend()}
            placeholder={placeholder}
            disabled={isRecording}
            className="flex-1 min-w-0 py-4 px-5 text-lg rounded-lg border-none
                       bg-chat-secondary text-white placeholder:text-gray-400
                       focus:outline-none focus:ring-2 focus:ring-chat-accent
                       disabled:opacity-50"
          />

          {/* Send button */}
          <button
            onClick={onSend}
            disabled={!canSend}
            className="shrink-0 w-14 h-14 rounded-full bg-chat-accent text-white
                       flex items-center justify-center
                       hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all"
            title="Send message"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    )
  }
)
VoiceInput.displayName = 'VoiceInput'
