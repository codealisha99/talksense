import type { SpeakingPaceMetrics } from '../../speech.ts'

type SpeakingPaceMeterProps = {
  pace: SpeakingPaceMetrics
}

const TEMPO_LABELS: Record<SpeakingPaceMetrics['tempoStatus'], { label: string; color: string; desc: string }> = {
  VERY_SLOW: { label: 'Very Deliberate', color: 'var(--bad)', desc: '< 110 WPM' },
  SLOW: { label: 'Measured', color: 'var(--mid)', desc: '110–130 WPM' },
  MODERATE: { label: 'Conversational Target', color: 'var(--good)', desc: '130–165 WPM' },
  FAST: { label: 'Brisk', color: 'var(--mid)', desc: '165–190 WPM' },
  VERY_FAST: { label: 'Rushed', color: 'var(--bad)', desc: '> 190 WPM' },
}

export default function SpeakingPaceMeter({ pace }: SpeakingPaceMeterProps) {
  const tempo = TEMPO_LABELS[pace.tempoStatus]
  const targetPct = Math.min(100, Math.max(0, ((pace.overallWpm - 60) / (220 - 60)) * 100))

  return (
    <div className="speaking-pace-card" style={{
      background: 'var(--card)',
      border: '1px solid var(--line)',
      borderRadius: 'var(--radius)',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 500, color: 'var(--ink)' }}>Speaking Pace</h3>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
            Speech cadence and articulation speed
          </p>
        </div>
        <span style={{
          padding: '4px 10px',
          borderRadius: 'var(--radius-sm)',
          fontSize: 12,
          fontWeight: 600,
          background: 'var(--paper-2)',
          color: tempo.color,
          border: '1px solid var(--line)',
        }}>
          {tempo.label}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{
          padding: '14px 16px',
          background: 'var(--paper-2)',
          borderRadius: 'var(--radius-sm)',
        }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Overall Pace
          </div>
          <div style={{ fontSize: 28, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--mono)' }}>
            {pace.overallWpm} <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--muted)' }}>WPM</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
            Total time elapsed ({pace.totalDurationSeconds.toFixed(1)}s)
          </div>
        </div>

        <div style={{
          padding: '14px 16px',
          background: 'var(--paper-2)',
          borderRadius: 'var(--radius-sm)',
        }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Active Articulation
          </div>
          <div style={{ fontSize: 28, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--mono)' }}>
            {pace.activeWpm} <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--muted)' }}>WPM</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
            Pauses excluded ({pace.activeSpeakingDurationSeconds.toFixed(1)}s voiced)
          </div>
        </div>
      </div>

      {/* Pace gauge visual bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 6, fontFamily: 'var(--mono)' }}>
          <span>60 (Slow)</span>
          <span>145 (Target: Conversational)</span>
          <span>220+ (Rushed)</span>
        </div>
        <div style={{
          position: 'relative',
          height: 10,
          background: 'var(--paper-2)',
          borderRadius: 5,
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute',
            left: `${targetPct}%`,
            top: 0,
            bottom: 0,
            width: 4,
            background: tempo.color,
            borderRadius: 2,
            transform: 'translateX(-50%)',
          }} />
        </div>
      </div>

      {/* Rolling pace segment timeline if multiple segments exist */}
      {pace.segments.length > 1 && (
        <div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>Pacing Consistency Across Explanation:</div>
          <div style={{ display: 'flex', gap: 4, height: 36, alignItems: 'flex-end' }}>
            {pace.segments.map((seg, i) => {
              const heightPct = Math.min(100, Math.max(15, (seg.wpm / 200) * 100))
              return (
                <div
                  key={i}
                  title={`${seg.startSecond.toFixed(0)}s–${seg.endSecond.toFixed(0)}s: ${seg.wpm} WPM`}
                  style={{
                    flex: 1,
                    height: `${heightPct}%`,
                    background: seg.wpm < 110 || seg.wpm > 180 ? 'var(--mid)' : 'var(--good)',
                    borderRadius: 2,
                    opacity: 0.85,
                  }}
                />
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
