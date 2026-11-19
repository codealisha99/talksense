import type { NormalizedTranscript, SpeakingPaceMetrics, PaceSegment } from '../../../src/speech.ts'

export type PaceThresholds = {
  verySlowMax: number // e.g. < 110
  slowMax: number // e.g. < 130
  moderateMax: number // e.g. < 165
  fastMax: number // e.g. < 190
  pauseExclusionThresholdSeconds: number // pauses >= 0.5s are deducted from active speaking time
}

export const DEFAULT_PACE_THRESHOLDS: PaceThresholds = {
  verySlowMax: 110,
  slowMax: 130,
  moderateMax: 165,
  fastMax: 190,
  pauseExclusionThresholdSeconds: 0.5,
}

/**
 * Speaking pace calculation engine.
 * Computes overall WPM, active speaking WPM (excluding silences), tempo status, and rolling segments.
 */
export class SpeakingPaceEngine {
  private readonly thresholds: PaceThresholds

  constructor(thresholds: Partial<PaceThresholds> = {}) {
    this.thresholds = { ...DEFAULT_PACE_THRESHOLDS, ...thresholds }
  }

  public classifyTempo(wpm: number): 'VERY_SLOW' | 'SLOW' | 'MODERATE' | 'FAST' | 'VERY_FAST' {
    if (wpm < this.thresholds.verySlowMax) return 'VERY_SLOW'
    if (wpm < this.thresholds.slowMax) return 'SLOW'
    if (wpm < this.thresholds.moderateMax) return 'MODERATE'
    if (wpm < this.thresholds.fastMax) return 'FAST'
    return 'VERY_FAST'
  }

  public analyze(transcript: NormalizedTranscript, audioDurationSeconds?: number): SpeakingPaceMetrics {
    const words = transcript.words
    const wordCount = words.length

    const totalDurationSeconds = Math.max(
      audioDurationSeconds ?? 0,
      transcript.durationSeconds ?? 0,
      words.length > 0 ? words[words.length - 1].end : 0,
    )

    if (wordCount === 0 || totalDurationSeconds <= 0) {
      return {
        overallWpm: 0,
        activeWpm: 0,
        totalDurationSeconds: Math.round(totalDurationSeconds * 10) / 10,
        activeSpeakingDurationSeconds: 0,
        tempoStatus: 'VERY_SLOW',
        calculationMethod: 'ZERO_INPUT',
        confidence: 1.0,
        segments: [],
        evidence: 'No spoken words detected in recording.',
      }
    }

    // Determine active speaking duration by summing words and short micro-pauses (< exclusion threshold)
    let totalPauseExcluded = 0
    let hasTimestamps = false

    for (let i = 0; i < words.length - 1; i++) {
      const curEnd = words[i].end
      const nextStart = words[i + 1].start
      if (curEnd > 0 || nextStart > 0) hasTimestamps = true

      const gap = nextStart - curEnd
      if (gap >= this.thresholds.pauseExclusionThresholdSeconds) {
        totalPauseExcluded += gap
      }
    }

    // Also deduct initial and final dead air if timestamps are reliable
    if (words.length > 0 && words[0].start >= this.thresholds.pauseExclusionThresholdSeconds) {
      totalPauseExcluded += words[0].start
    }
    const trailingSilence = totalDurationSeconds - words[words.length - 1].end
    if (trailingSilence >= this.thresholds.pauseExclusionThresholdSeconds) {
      totalPauseExcluded += trailingSilence
    }

    const activeSpeakingDurationSeconds = Math.max(
      0.5,
      Math.round((totalDurationSeconds - totalPauseExcluded) * 100) / 100,
    )

    const overallMinutes = totalDurationSeconds / 60
    const activeMinutes = activeSpeakingDurationSeconds / 60

    const overallWpm = Math.round((wordCount / overallMinutes) * 10) / 10
    const activeWpm = Math.round((wordCount / activeMinutes) * 10) / 10

    const tempoStatus = this.classifyTempo(activeWpm)

    const segments = this.calculateSegments(words, totalDurationSeconds, 30) // 30-second windows

    // Calculate pace variability across active segments
    const validWpms = segments.map((s) => s.wpm).filter((w) => w > 0)
    let paceStdDev = 0
    if (validWpms.length > 1) {
      const mean = validWpms.reduce((a, b) => a + b, 0) / validWpms.length
      const variance = validWpms.reduce((sum, w) => sum + Math.pow(w - mean, 2), 0) / validWpms.length
      paceStdDev = Math.round(Math.sqrt(variance) * 10) / 10
    }

    const calculationMethod = hasTimestamps
      ? 'ACTIVE_TIME_MINUS_PAUSES'
      : 'TOTAL_DURATION_ESTIMATE'

    const confidence = hasTimestamps ? 0.95 : 0.6

    const paceConsistency = paceStdDev < 20 ? 'consistent' : paceStdDev < 40 ? 'moderate variation' : 'erratic pace'

    const evidence = `Detected ${wordCount} words across ${totalDurationSeconds.toFixed(1)}s total recording. ` +
      `Active speaking time: ${activeSpeakingDurationSeconds.toFixed(1)}s (excluding ${(totalDurationSeconds - activeSpeakingDurationSeconds).toFixed(1)}s silences). ` +
      `Pace: ${activeWpm} active WPM (${overallWpm} overall WPM) classified as ${tempoStatus} (${paceConsistency}).`

    return {
      overallWpm,
      activeWpm,
      totalDurationSeconds: Math.round(totalDurationSeconds * 100) / 100,
      activeSpeakingDurationSeconds,
      tempoStatus,
      calculationMethod,
      confidence,
      segments,
      evidence,
    }
  }

  public calculateSegments(
    words: NormalizedTranscript['words'],
    totalDurationSeconds: number,
    windowSeconds: number = 30,
  ): PaceSegment[] {
    if (totalDurationSeconds <= 0 || words.length === 0) return []

    const segments: PaceSegment[] = []
    const numWindows = Math.max(1, Math.ceil(totalDurationSeconds / windowSeconds))

    for (let w = 0; w < numWindows; w++) {
      const startSecond = w * windowSeconds
      const endSecond = Math.min(totalDurationSeconds, (w + 1) * windowSeconds)
      const windowDuration = endSecond - startSecond

      const windowWords = words.filter((word) => {
        const mid = (word.start + word.end) / 2
        return mid >= startSecond && mid < endSecond
      })

      const wordsCount = windowWords.length
      const wpm = windowDuration > 0 ? Math.round((wordsCount / (windowDuration / 60)) * 10) / 10 : 0

      segments.push({
        startSecond,
        endSecond,
        wordsCount,
        wpm,
      })
    }

    return segments
  }
}
