import type {
  NormalizedTranscript,
  PauseCategory,
  PauseEvent,
  PauseMetrics,
} from '../../../src/speech.ts'

export type PauseThresholds = {
  minNoticeablePauseSeconds: number // e.g. 0.25s
  hesitationThresholdSeconds: number // e.g. 0.5s
  longSilenceThresholdSeconds: number // e.g. 1.5s
}

export const DEFAULT_PAUSE_THRESHOLDS: PauseThresholds = {
  minNoticeablePauseSeconds: 0.25,
  hesitationThresholdSeconds: 0.5,
  longSilenceThresholdSeconds: 1.5,
}

/**
 * Pause and hesitation analysis engine.
 * Measures inter-word gaps and distinguishes sentence-boundary pauses from mid-clause hesitation.
 */
export class PauseAnalysisEngine {
  private readonly thresholds: PauseThresholds

  constructor(thresholds: Partial<PauseThresholds> = {}) {
    this.thresholds = { ...DEFAULT_PAUSE_THRESHOLDS, ...thresholds }
  }

  public categorizePause(duration: number, previousWordPunct?: string): PauseCategory {
    if (duration >= this.thresholds.longSilenceThresholdSeconds) {
      return 'LONG_SILENCE'
    }

    // Check if the preceding token has terminal or clause-boundary punctuation
    const hasPunctuation = previousWordPunct && /[.,!?;:]$/.test(previousWordPunct.trim())

    if (duration >= this.thresholds.hesitationThresholdSeconds) {
      // An extended pause with no punctuation in between indicates unscripted hesitation
      return hasPunctuation ? 'GRAMMATICAL_PAUSE' : 'HESITATION_PAUSE'
    }

    if (duration >= this.thresholds.minNoticeablePauseSeconds) {
      return hasPunctuation ? 'GRAMMATICAL_PAUSE' : 'NORMAL_ARTICULATION'
    }

    return 'NORMAL_ARTICULATION'
  }

  public analyze(transcript: NormalizedTranscript, totalDurationSeconds?: number): PauseMetrics {
    const words = transcript.words
    const duration = Math.max(
      totalDurationSeconds ?? 0,
      transcript.durationSeconds ?? 0,
      words.length > 0 ? words[words.length - 1].end : 0,
    )

    if (words.length < 2) {
      return {
        totalPauses: 0,
        averagePauseDurationSeconds: 0,
        longestPauseSeconds: 0,
        totalPauseDurationSeconds: 0,
        pausesPerMinute: 0,
        silenceRatio: 0,
        events: [],
        distribution: { shortCount: 0, moderateCount: 0, longCount: 0 },
      }
    }

    const events: PauseEvent[] = []
    let shortCount = 0
    let moderateCount = 0
    let longCount = 0
    let totalPauseDuration = 0
    let longestPause = 0

    for (let i = 0; i < words.length - 1; i++) {
      const prev = words[i]
      const next = words[i + 1]

      const gap = Math.round((next.start - prev.end) * 1000) / 1000

      // Only evaluate pauses that meet the minimum noticeable threshold
      if (gap >= this.thresholds.minNoticeablePauseSeconds) {
        const category = this.categorizePause(gap, prev.punctuatedText || prev.text)

        if (gap < this.thresholds.hesitationThresholdSeconds) {
          shortCount++
        } else if (gap < this.thresholds.longSilenceThresholdSeconds) {
          moderateCount++
        } else {
          longCount++
        }

        totalPauseDuration += gap
        if (gap > longestPause) longestPause = gap

        const prevContext = words.slice(Math.max(0, i - 2), i + 1).map((w) => w.punctuatedText || w.text).join(' ')
        const nextContext = words.slice(i + 1, Math.min(words.length, i + 4)).map((w) => w.punctuatedText || w.text).join(' ')

        events.push({
          id: `p-${i}-${Math.round(prev.end * 100)}`,
          start: prev.end,
          end: next.start,
          durationSeconds: gap,
          category,
          previousWord: prev.text,
          nextWord: next.text,
          wordIndexAfter: i + 1,
          context: `"...${prevContext} [pause ${gap.toFixed(2)}s] ${nextContext}..."`,
        })
      }
    }

    const totalPauses = events.length
    const averagePauseDuration = totalPauses > 0
      ? Math.round((totalPauseDuration / totalPauses) * 100) / 100
      : 0

    const minutes = duration > 0 ? duration / 60 : 1
    const pausesPerMinute = Math.round((totalPauses / minutes) * 10) / 10

    const silenceRatio = duration > 0
      ? Math.min(1, Math.round((totalPauseDuration / duration) * 1000) / 1000)
      : 0

    return {
      totalPauses,
      averagePauseDurationSeconds: averagePauseDuration,
      longestPauseSeconds: Math.round(longestPause * 100) / 100,
      totalPauseDurationSeconds: Math.round(totalPauseDuration * 100) / 100,
      pausesPerMinute,
      silenceRatio,
      events,
      distribution: {
        shortCount,
        moderateCount,
        longCount,
      },
    }
  }
}
