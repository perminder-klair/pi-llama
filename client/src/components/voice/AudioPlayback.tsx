import { Loader2, Volume2, VolumeX } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AudioPlaybackProps {
  onPlay: () => void
  onStop: () => void
  isPlaying: boolean
  isLoading: boolean
  className?: string
}

export function AudioPlayback({
  onPlay,
  onStop,
  isPlaying,
  isLoading,
  className,
}: AudioPlaybackProps) {
  const handleClick = () => {
    if (isPlaying) {
      onStop()
    } else {
      onPlay()
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center',
        'transition-all disabled:cursor-not-allowed',
        isPlaying
          ? 'bg-chat-accent text-white'
          : 'bg-white/10 text-gray-300 hover:bg-white/20',
        className
      )}
      title={isPlaying ? 'Stop playback' : 'Play audio'}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isPlaying ? (
        <VolumeX className="w-4 h-4" />
      ) : (
        <Volume2 className="w-4 h-4" />
      )}
    </button>
  )
}
