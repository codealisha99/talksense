import type { AcousticMetrics } from '../../speech.ts'

type AcousticVoiceMetricsProps = {
  acoustics: AcousticMetrics
}

const MONOTONY_LABELS: Record<AcousticMetrics['pitchVariationStatus'], { label: string; color: string; desc: string }> = {
  MONOTONE: { label: 'Monotone Delivery', color: 'var(--mid)', desc: 'Low pitch modulation (< 15 Hz std dev)' },
  BALANCED: { label: 'Dynamic & Expressive', color: 'var(--good)', desc: 'Healthy vocal inflection (15–50 Hz std dev)' },
  HIGH_VARIATION: { label: 'Highly Varied', color: 'var(--mid)', desc: 'Dramatic pitch swings (> 50 Hz std dev)' },
  UNAVAILABLE: { label: 'Signal Unavailable', color: 'var(--muted)', desc: 'Requires uncompressed WAV audio' },
}

export default function AcousticVoiceMetrics({ acoustics }: AcousticVoiceMetricsProps) {
  const variation = MONOTONY_LABELS[acoustics.pitchVariationStatus]

  return (
    <div className="acoustics-card" style={{
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
          <h3 style={{ fontSize: 16, fontWeight: 500, color: 'var(--ink)' }}>Voice Characteristics & Acoustics</h3>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
            Digital signal processing of pitch F0, dynamics, and vocal energy
          </p>
        </div>
        <span style={{
          padding: '4px 10px',
          borderRadius: 'var(--radius-sm)',
          fontSize: 12,
          fontWeight: 600,
          background: 'var(--paper-2)',
          color: variation.color,
          border: '1px solid var(--line)',
        }}>
          {variation.label}
        </span>
      </div>

      {acoustics.status === 'UNAVAILABLE' || acoustics.status === 'DEGRADED' ? (
        <div style={{
          padding: '14px 16px',
          background: 'var(--paper-2)',
          borderRadius: 'var(--radius-sm)',
          fontSize: 13,
          color: 'var(--muted)',
        }}>
          ℹ {acoustics.diagnosticMessage || 'Acoustic signal processing requires an uncompressed PCM/WAV recording. Compressed WebM/MP4 recordings provide pace, pause, and lexical intelligence without raw pitch extraction.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <div style={{ padding: '12px', background: 'var(--paper-2)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>Fundamental Pitch (F0)</div>
            <div style={{ fontSize: 20, fontWeight: 600, fontFamily: 'var(--mono)', color: 'var(--ink)' }}>
              {acoustics.meanF0Hz !== null ? `${Math.round(acoustics.meanF0Hz)} Hz` : '—'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
              {acoustics.pitchMinHz && acoustics.pitchMaxHz
                ? `Range: ${Math.round(acoustics.pitchMinHz)}–${Math.round(acoustics.pitchMaxHz)} Hz`
                : 'Std Dev: ±' + (acoustics.f0StdDevHz?.toFixed(1) || '0') + ' Hz'}
            </div>
          </div>

          <div style={{ padding: '12px', background: 'var(--paper-2)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>Dynamic Energy</div>
            <div style={{ fontSize: 20, fontWeight: 600, fontFamily: 'var(--mono)', color: 'var(--ink)' }}>
              {acoustics.meanRmsEnergyDb !== null ? `${Math.round(acoustics.meanRmsEnergyDb)} dBFS` : '—'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
              Range: {acoustics.energyDynamicRangeDb ? `${Math.round(acoustics.energyDynamicRangeDb)} dB` : '—'}
            </div>
          </div>

          <div style={{ padding: '12px', background: 'var(--paper-2)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>Voiced Phonation</div>
            <div style={{ fontSize: 20, fontWeight: 600, fontFamily: 'var(--mono)', color: 'var(--ink)' }}>
              {acoustics.voicedFrameRatio !== null ? `${Math.round(acoustics.voicedFrameRatio * 100)}%` : '—'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
              Active vocal cord engagement
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
