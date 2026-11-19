import type { NormalizedWord } from '../../../src/speech.ts'

export type AlignmentOptions = {
  characterDurationFactor?: number // Average seconds per character (~0.05s)
  minWordDuration?: number // Minimum seconds per word
  interWordGap?: number // Default spacing between words
}

/**
 * Fallback alignment engine for transcripts lacking word-level timestamps.
 * Distributes words proportionally across audio duration using syllable/character weighting.
 * Explicitly marks confidence as estimated so downstream consumers know timestamps were interpolated.
 */
export class TimestampAligner {
  public static interpolateWordTimestamps(
    tokens: string[],
    totalDurationSeconds: number,
    options: AlignmentOptions = {},
  ): NormalizedWord[] {
    if (tokens.length === 0 || totalDurationSeconds <= 0) {
      return []
    }

    const minDuration = options.minWordDuration ?? 0.15
    const interGap = options.interWordGap ?? 0.05

    // Weight words by length (longer words receive proportionally more time)
    const weights = tokens.map((t) => Math.max(1, t.length))
    const totalWeight = weights.reduce((a, b) => a + b, 0)

    const availableSpeechTime = Math.max(0.1, totalDurationSeconds - (tokens.length - 1) * interGap)
    let currentStart = 0

    const words: NormalizedWord[] = []

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]
      const clean = token.replace(/^[^\w]+|[^\w]+$/g, '') || token
      const share = (weights[i] / totalWeight) * availableSpeechTime
      const duration = Math.max(minDuration, share)

      const start = currentStart
      const end = Math.min(totalDurationSeconds, start + duration)
      currentStart = end + interGap

      words.push({
        text: clean,
        start: Math.round(start * 1000) / 1000,
        end: Math.round(end * 1000) / 1000,
        confidence: 0.3, // Explicit low confidence indicates interpolated alignment
        punctuatedText: token,
      })
    }

    return words
  }
}
