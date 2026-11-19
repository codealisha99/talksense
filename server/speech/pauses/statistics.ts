import type { PauseMetrics, PauseEvent } from '../../../src/speech.ts'

export type ExtendedPauseDiagnostics = {
  phonationRatio: number // Ratio of speech time to total recording time (e.g. 0.75 = 75% talking)
  awkwardPauseCount: number // Pauses >= 2.0s without punctuation
  pauseRegularity: 'STEADY' | 'OCCASIONAL_GAPS' | 'HIGHLY_IRREGULAR'
  longestHesitation: PauseEvent | null
  sentencePauseRatio: number // Ratio of grammatical pauses to total pauses
}

/**
 * Computes higher-order pause and silence statistics for speaking assessments.
 */
export function computePauseDiagnostics(
  metrics: PauseMetrics,
  totalDurationSeconds: number,
): ExtendedPauseDiagnostics {
  const events = metrics.events
  const totalPauseDuration = metrics.totalPauseDurationSeconds

  const phonationRatio = totalDurationSeconds > 0
    ? Math.max(0, Math.min(1, Math.round(((totalDurationSeconds - totalPauseDuration) / totalDurationSeconds) * 100) / 100))
    : 1.0

  const awkwardPauses = events.filter((e) => e.durationSeconds >= 2.0 && e.category === 'HESITATION_PAUSE')
  const grammaticalPauses = events.filter((e) => e.category === 'GRAMMATICAL_PAUSE')

  const sentencePauseRatio = events.length > 0
    ? Math.round((grammaticalPauses.length / events.length) * 100) / 100
    : 0

  // Calculate variance of pause durations
  let pauseRegularity: 'STEADY' | 'OCCASIONAL_GAPS' | 'HIGHLY_IRREGULAR' = 'STEADY'
  if (events.length > 2) {
    const mean = totalPauseDuration / events.length
    const variance = events.reduce((acc, e) => acc + Math.pow(e.durationSeconds - mean, 2), 0) / events.length
    const stdDev = Math.sqrt(variance)
    const cv = mean > 0 ? stdDev / mean : 0 // Coefficient of variation

    if (cv > 1.2 || awkwardPauses.length > 2) {
      pauseRegularity = 'HIGHLY_IRREGULAR'
    } else if (cv > 0.7 || awkwardPauses.length > 0) {
      pauseRegularity = 'OCCASIONAL_GAPS'
    }
  }

  const hesitationEvents = events.filter((e) => e.category === 'HESITATION_PAUSE' || e.category === 'LONG_SILENCE')
  const longestHesitation = hesitationEvents.length > 0
    ? [...hesitationEvents].sort((a, b) => b.durationSeconds - a.durationSeconds)[0]
    : null

  return {
    phonationRatio,
    awkwardPauseCount: awkwardPauses.length,
    pauseRegularity,
    longestHesitation,
    sentencePauseRatio,
  }
}
