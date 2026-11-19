import type { LanguageMetrics } from '../../speech.ts'

type GrammarSuggestionsCardProps = {
  language: LanguageMetrics
}

export default function GrammarSuggestionsCard({ language }: GrammarSuggestionsCardProps) {
  const { grammarIssues, vocabulary, clarityAssessment } = language

  return (
    <div className="grammar-card" style={{
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
          <h3 style={{ fontSize: 16, fontWeight: 500, color: 'var(--ink)' }}>Language & Grammar Quality</h3>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
            Vocabulary variety, lexical diversity, and spoken phrasing
          </p>
        </div>
      </div>

      <div style={{
        padding: '12px 16px',
        background: 'var(--paper-2)',
        borderRadius: 'var(--radius-sm)',
        fontSize: 14,
        color: 'var(--ink-2)',
        fontStyle: 'italic',
      }}>
        "{clarityAssessment}"
      </div>

      {/* Vocabulary Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <div style={{ padding: '12px', background: 'var(--paper-2)', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>Lexical Diversity (TTR)</div>
          <div style={{ fontSize: 20, fontWeight: 600, fontFamily: 'var(--mono)', color: 'var(--ink)' }}>
            {(vocabulary.typeTokenRatio * 100).toFixed(0)}%
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
            {vocabulary.uniqueWords} unique / {vocabulary.totalWords} total
          </div>
        </div>

        <div style={{ padding: '12px', background: 'var(--paper-2)', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>Moving-Avg TTR</div>
          <div style={{ fontSize: 20, fontWeight: 600, fontFamily: 'var(--mono)', color: 'var(--ink)' }}>
            {(vocabulary.movingAverageTTR * 100).toFixed(0)}%
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
            Window: {vocabulary.ttrWindowSize} words
          </div>
        </div>

        <div style={{ padding: '12px', background: 'var(--paper-2)', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>Top Repeated Words</div>
          <div style={{ fontSize: 12, color: 'var(--ink)', marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {vocabulary.repetitiveWords.length === 0 ? (
              <span style={{ color: 'var(--muted)' }}>None excessive</span>
            ) : (
              vocabulary.repetitiveWords.slice(0, 3).map((rw) => (
                <span key={rw.word} style={{ background: 'var(--line)', padding: '1px 6px', borderRadius: 4, fontSize: 11 }}>
                  {rw.word} ({rw.count}×)
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Grammar & Phrasing Suggestions */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', marginBottom: 10 }}>
          Phrasing Suggestions ({grammarIssues.length})
        </div>

        {grammarIssues.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--good)', padding: '10px 0' }}>
            ✓ No grammatical disfluencies or syntax slips detected.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {grammarIssues.map((issue) => (
              <div
                key={issue.id}
                style={{
                  padding: '12px 14px',
                  background: 'var(--paper-2)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      textDecoration: 'line-through',
                      color: 'var(--bad)',
                      fontWeight: 500,
                      fontSize: 13,
                    }}>
                      "{issue.originalText}"
                    </span>
                    <span style={{ color: 'var(--muted)' }}>→</span>
                    <span style={{
                      color: 'var(--good)',
                      fontWeight: 600,
                      fontSize: 13,
                    }}>
                      "{issue.suggestedCorrection}"
                    </span>
                  </div>

                  {issue.isLikelyAsrArtifact && (
                    <span style={{
                      fontSize: 10,
                      padding: '2px 6px',
                      background: 'var(--paper)',
                      border: '1px solid var(--line)',
                      borderRadius: 4,
                      color: 'var(--muted)',
                    }}>
                      Possible ASR slip
                    </span>
                  )}
                </div>

                <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>
                  {issue.explanation}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
