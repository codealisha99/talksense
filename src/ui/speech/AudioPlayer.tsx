import { useState, useRef, useEffect } from 'react'

type AudioPlayerProps = {
  src: string
  recordingId?: string | null
  onSeek?: (seconds: number) => void
  onDeleteRecording?: () => void
  isOwner?: boolean
}

export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function AudioPlayer({
  src,
  recordingId,
  onSeek,
  onDeleteRecording,
  isOwner,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handleLoadedMetadata = () => setDuration(audio.duration)
    const handleEnded = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [src])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false))
    }
  }

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = newTime
      setCurrentTime(newTime)
    }
    onSeek?.(newTime)
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to permanently delete this audio recording? The transcript and speech report will be preserved.')) {
      return
    }
    setIsDeleting(true)
    try {
      onDeleteRecording?.()
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="audio-player-card" style={{
      background: 'var(--card)',
      border: '1px solid var(--line)',
      borderRadius: 'var(--radius)',
      padding: '16px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      <audio ref={audioRef} src={src} preload="metadata" />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={togglePlay}
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'var(--signal)',
              color: 'var(--signal-ink)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
            }}
            aria-label={isPlaying ? 'Pause' : 'Play audio recording'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>Audio Playback</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>
        </div>

        {isOwner && onDeleteRecording && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            style={{
              background: 'transparent',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 12px',
              fontSize: 12,
              color: 'var(--bad)',
              cursor: 'pointer',
            }}
            title="GDPR / privacy consent: delete stored audio"
          >
            {isDeleting ? 'Deleting...' : 'Delete Audio'}
          </button>
        )}
      </div>

      <input
        type="range"
        min={0}
        max={duration || 100}
        step={0.1}
        value={currentTime}
        onChange={handleSliderChange}
        style={{
          width: '100%',
          accentColor: 'var(--signal)',
          cursor: 'pointer',
        }}
        aria-label="Seek audio timeline"
      />
    </div>
  )
}
