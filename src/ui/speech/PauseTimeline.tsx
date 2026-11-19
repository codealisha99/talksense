import type { PauseMetrics } from '../../speech.ts'

type PauseTimelineProps = {
  pauses: PauseMetrics
  onSeek?: (seconds: number) => void
}

export default function PauseTimeline({ pauses, onSeek }: PauseTimelineProps) {
  const { totalPauses, averagePauseDurationSeconds, pausesPerMinute, silenceRatio, distribution, events } = pauses

  return (
    <div className="pause-timeline-card" style={{
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
          <h3 style={{ fontSize: 16, fontWeight: 500, color: 'var(--ink)' }}>Pauses & Hesitation</h3>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
            Silence distribution, natural breaths, and hesitation stops
          </p>
        </div>
        <span style={{
          fontSize: 12,
          fontFamily: 'var(--mono)',
          color: 'var(--muted)',
        }}>
          {pausesPerMinute.toFixed(1)} pauses/min
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <div style={{ padding: '12px', background: 'var(--paper-2)', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>Avg Duration</div>
          <div style={{ fontSize: 20, fontWeight: 600, fontFamily: 'var(--mono)', color: 'var(--ink)' }}>
            {averagePauseDurationSeconds.toFixed(2)}s
          </div>
        </div>

        <div style={{ padding: '12px', background: 'var(--paper-2)', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>Silence Ratio</div>
          <div style={{ fontSize: 20, fontWeight: 600, fontFamily: 'var(--mono)', color: 'var(--ink)' }}>
            {Math.round(silenceRatio * 100)}%
          </div>
        </div>

        <div style={{ padding: '12px', background: 'var(--paper-2)', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>Hesitation Gaps</div>
          <div style={{ fontSize: 20, fontWeight: 600, fontFamily: 'var(--mono)', color: distribution.longCount > 2 ? 'var(--bad)' : 'var(--ink)' }}>
            {distribution.longCount}
          </div>
        </div>
      </div>

      {/* Distribution pills */}
      <div style={{ display: 'flex', gap: 10, fontSize: 12 }}>
        <div style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)' }}>
          <span style={{ color: 'var(--good)', fontWeight: 600 }}>{distribution.shortCount}</span> Short (0.25–0.5s)
        </div>
        <div style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)' }}>
          <span style={{ color: 'var(--mid)', fontWeight: 600 }}>{distribution.moderateCount}</span> Moderate (0.5–1.5s)
        </div>
        <div style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)' }}>
          <span style={{ color: 'var(--bad)', fontWeight: 600 }}>{distribution.longCount}</span> Long (&gt; 1.5s)
        </div>
      </div>

      {/* Hesitation Events list */}
      {events.filter((e) => e.category === 'HESITATION_PAUSE' || e.category === 'LONG_SILENCE').length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', marginBottom: 8 }}>
            Notable Hesitations:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {events
              .filter((e) => e.category === 'HESITATION_PAUSE' || e.category === 'LONG_SILENCE')
              .slice(0, 5)
              .map((e) => (
                <div
                  key={e.id}
                  onClick={() => onSeek?.(e.start)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'var(--paper-2)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ color: 'var(--ink-2)', fontStyle: 'italic' }}>"{e.context}"</span>
                  <span style={{ color: 'var(--bad)', fontFamily: 'var(--mono)', fontWeight: 600 }}>
                    {e.durationSeconds.toFixed(2)}s at {e.start.toFixed(1)}s
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
