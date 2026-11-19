import { useState } from 'react'
import type { SpeechReport } from '../../speech.ts'
import { api } from '../../api.ts'
import AudioPlayer from './AudioPlayer.tsx'
import SpeakingPaceMeter from './SpeakingPaceMeter.tsx'
import PauseTimeline from './PauseTimeline.tsx'
import TranscriptHighlighter from './TranscriptHighlighter.tsx'
import GrammarSuggestionsCard from './GrammarSuggestionsCard.tsx'
import AcousticVoiceMetrics from './AcousticVoiceMetrics.tsx'

type SpeechAnalysisPanelProps = {
  report: SpeechReport
  isOwner?: boolean
}

export default function SpeechAnalysisPanel({ report, isOwner }: SpeechAnalysisPanelProps) {
  const [audioUrl, setAudioUrl] = useState<string | null>(report.audioPlayableUrl)
  const [currentSeekTime, setCurrentSeekTime] = useState<number | null>(null)

  const handleSeek = (seconds: number) => {
    setCurrentSeekTime(seconds)
    const audioEl = document.querySelector('audio')
    if (audioEl) {
      audioEl.currentTime = seconds
      audioEl.play().catch(() => {})
    }
  }

  const handleDeleteRecording = async () => {
    if (!report.recordingId) return
    try {
      await api.deleteRecording(report.recordingId)
      setAudioUrl(null)
    } catch (err) {
      alert('Failed to delete recording: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  return (
    <div className="speech-analysis-panel" style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 28,
    }}>
      {/* Audio Playback Player */}
      {audioUrl && (
        <AudioPlayer
          src={audioUrl}
          recordingId={report.recordingId}
          onSeek={handleSeek}
          onDeleteRecording={handleDeleteRecording}
          isOwner={isOwner}
        />
      )}

      {/* Diagnostics / Limitations Alert if present */}
      {report.limitations.length > 0 && (
        <div style={{
          padding: '12px 16px',
          background: 'var(--paper-2)',
          borderLeft: '3px solid var(--mid)',
          borderRadius: 'var(--radius-sm)',
          fontSize: 13,
          color: 'var(--muted)',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}>
          <b>Analysis Diagnostics:</b>
          {report.limitations.map((lim, idx) => (
            <span key={idx}>• {lim}</span>
          ))}
        </div>
      )}

      {/* Speaking Pace & Pause Diagnostics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        <SpeakingPaceMeter pace={report.pace} />
        <PauseTimeline pauses={report.pauses} onSeek={handleSeek} />
      </div>

      {/* Interactive Transcript with Highlighted Disfluencies */}
      <TranscriptHighlighter report={report} onSeek={handleSeek} />

      {/* Grammar, Phrasing & Lexical Diversity */}
      <GrammarSuggestionsCard language={report.language} />

      {/* Acoustic Voice Characteristics */}
      <AcousticVoiceMetrics acoustics={report.acoustics} />
    </div>
  )
}
