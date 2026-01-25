import { Settings } from 'lucide-react'
import { useState } from 'react'
import type { VoiceName } from '@/lib/voice-api'
import { cn } from '@/lib/utils'

const VOICES: Array<{ value: VoiceName; label: string }> = [
  { value: 'alloy', label: 'Alloy' },
  { value: 'echo', label: 'Echo' },
  { value: 'fable', label: 'Fable' },
  { value: 'onyx', label: 'Onyx' },
  { value: 'nova', label: 'Nova' },
  { value: 'shimmer', label: 'Shimmer' },
]

interface VoiceSettingsProps {
  autoPlay: boolean
  onAutoPlayChange: (value: boolean) => void
  voice: VoiceName
  onVoiceChange: (voice: VoiceName) => void
}

export function VoiceSettings({
  autoPlay,
  onAutoPlayChange,
  voice,
  onVoiceChange,
}: VoiceSettingsProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center',
          'transition-all',
          isOpen
            ? 'bg-chat-accent text-white'
            : 'bg-chat-secondary text-gray-300 hover:text-white'
        )}
        title="Voice settings"
      >
        <Settings className="w-4 h-4" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div
            className="absolute right-0 top-full mt-2 z-20 w-56
                       bg-chat-secondary rounded-lg shadow-lg p-4 space-y-4"
          >
            {/* Auto-play toggle */}
            <div className="flex items-center justify-between">
              <label
                htmlFor="autoplay"
                className="text-sm text-gray-300 cursor-pointer"
              >
                Auto-play responses
              </label>
              <button
                id="autoplay"
                role="switch"
                aria-checked={autoPlay}
                onClick={() => onAutoPlayChange(!autoPlay)}
                className={cn(
                  'w-10 h-6 rounded-full transition-colors relative',
                  autoPlay ? 'bg-chat-accent' : 'bg-gray-600'
                )}
              >
                <span
                  className={cn(
                    'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                    autoPlay ? 'translate-x-5' : 'translate-x-1'
                  )}
                />
              </button>
            </div>

            {/* Voice selector */}
            <div className="space-y-2">
              <label className="text-sm text-gray-300">Voice</label>
              <select
                value={voice}
                onChange={(e) => onVoiceChange(e.target.value as VoiceName)}
                className="w-full px-3 py-2 bg-chat-bg text-white rounded-lg
                           border-none focus:outline-none focus:ring-2 focus:ring-chat-accent
                           cursor-pointer"
              >
                {VOICES.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
