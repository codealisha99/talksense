import type { SpeechReport } from '../../speech.ts'

type TranscriptHighlighterProps = {
  report: SpeechReport
  onSeek?: (seconds: number) => void
}

export default function TranscriptHighlighter({ report, onSeek }: TranscriptHighlighterProps) {
  const { transcript, fillers, pauses, repetition, language } = report
  const words = transcript.words

  // Map occurrences for fast lookup by word index
  const fillersByIndex = new Map<number, (typeof fillers.occurrences)[0]>()
  for (const f of fillers.occurrences) {
    if (f.classification !== 'MEANINGFUL_USAGE') {
      fillersByIndex.set(f.wordIndex, f)
    }
  }

  const pausesAfterIndex = new Map<number, (typeof pauses.events)[0]>()
  for (const p of pauses.events) {
    pausesAfterIndex.set(p.wordIndexAfter, p)
  }

  return (
    <div className="transcript-highlighter-card" style={{
      background: 'var(--card)',
      border: '1px solid var(--line)',
      borderRadius: 'var(--radius)',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: 16, fontWeight: 500, color: 'var(--ink)' }}>Interactive Speech Transcript</h3>
        <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
          Click words or pauses to jump in audio
        </span>
      </div>

      <div style={{
        lineHeight: '2.1',
        fontSize: '15px',
        color: 'var(--ink)',
        fontFamily: 'var(--sans)',
      }}>
        {words.map((w, idx) => {
          const pauseBefore = pausesAfterIndex.get(idx)
          const filler = fillersByIndex.get(idx)

          const rep = repetition.events.find((r) => idx >= r.startIndex && idx <= r.endIndex)
          const gram = language.grammarIssues.find(
            (g) => idx >= g.startWordIndex && idx <= g.endWordIndex && !g.isLikelyAsrArtifact,
          )

          return (
            <span key={`${w.text}-${w.start}-${idx}`}>
              {pauseBefore && (
                <button
                  type="button"
                  onClick={() => onSeek?.(pauseBefore.start)}
                  title={`Pause: ${pauseBefore.durationSeconds.toFixed(2)}s (${pauseBefore.category.toLowerCase().replace('_', ' ')})`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    background: pauseBefore.category === 'HESITATION_PAUSE' || pauseBefore.category === 'LONG_SILENCE'
                      ? 'var(--signal-soft)'
                      : 'var(--paper-2)',
                    color: pauseBefore.category === 'HESITATION_PAUSE' || pauseBefore.category === 'LONG_SILENCE'
                      ? 'var(--bad)'
                      : 'var(--muted)',
                    border: '1px solid var(--line)',
                    borderRadius: 4,
                    padding: '1px 6px',
                    margin: '0 5px',
                    fontSize: 11,
                    fontFamily: 'var(--mono)',
                    cursor: 'pointer',
                    verticalAlign: 'middle',
                  }}
                >
                  ⏱ {pauseBefore.durationSeconds.toFixed(1)}s
                </button>
              )}

              <span
                onClick={() => onSeek?.(w.start)}
                title={
                  filler
                    ? `Filler: "${filler.canonical}" (${filler.classification}) - ${filler.reason}`
                    : gram
                    ? `Grammar: "${gram.originalText}" -> "${gram.suggestedCorrection}". ${gram.explanation}`
                    : rep
                    ? `Repetition: "${rep.phrase}" (${rep.reason})`
                    : `${w.start.toFixed(2)}s - ${w.end.toFixed(2)}s`
                }
                style={{
                  cursor: 'pointer',
                  borderRadius: 3,
                  padding: '1px 3px',
                  backgroundColor: filler
                    ? filler.classification === 'CONFIRMED_FILLER'
                      ? 'var(--signal-soft)'
                      : 'var(--hl)'
                    : undefined,
                  borderBottom: gram
                    ? '2px wavy var(--bad)'
                    : rep
                    ? '2px dotted var(--signal)'
                    : undefined,
                  fontWeight: filler ? 600 : undefined,
                  color: filler && filler.classification === 'CONFIRMED_FILLER' ? 'var(--bad)' : 'inherit',
                  transition: 'background-color 0.15s ease',
                }}
              >
                {w.punctuatedText || w.text}
              </span>
              {' '}
            </span>
          )
        })}
      </div>

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 16,
        paddingTop: 12,
        borderTop: '1px solid var(--line)',
        fontSize: 12,
        color: 'var(--muted)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 12, background: 'var(--signal-soft)', borderRadius: 2 }} />
          <span>Confirmed Filler</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 12, background: 'var(--hl)', borderRadius: 2 }} />
          <span>Discourse Marker</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ borderBottom: '2px wavy var(--bad)', padding: '0 4px' }}>grammar</span>
          <span>Suggested Correction</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ borderBottom: '2px dotted var(--signal)', padding: '0 4px' }}>repetition</span>
          <span>Repeated Phrase</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ padding: '0 4px', border: '1px solid var(--line)', borderRadius: 2, fontFamily: 'var(--mono)', fontSize: 10 }}>⏱ 0.8s</span>
          <span>Hesitation Pause</span>
        </div>
      </div>
    </div>
  )
}
