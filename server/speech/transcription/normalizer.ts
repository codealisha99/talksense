import { NormalizedTranscriptSchema, type NormalizedTranscript, type NormalizedWord } from '../../../src/speech.ts'
import { TranscriptionAlignmentError } from '../errors.ts'
import type { RawWhisperVerboseResponse, RawWhisperWord } from '../../openai.ts'

/**
 * Normalizes raw transcription output into a validated, provider-agnostic representation.
 * Cleans word tokens, verifies timing bounds, handles missing intervals, and preserves word order.
 */
export class TranscriptionNormalizer {
  public static normalizeWhisper(
    raw: RawWhisperVerboseResponse,
    provider: string = 'openai-whisper',
    fallbackDuration: number = 0,
  ): NormalizedTranscript {
    const rawText = String(raw?.text ?? '').trim()
    const rawWords = Array.isArray(raw?.words) ? raw.words : []

    let maxEnd = typeof raw?.duration === 'number' && raw.duration > 0 ? raw.duration : fallbackDuration
    const normalizedWords: NormalizedWord[] = []

    let lastEnd = 0

    for (let i = 0; i < rawWords.length; i++) {
      const w = rawWords[i]
      if (!w || typeof w.word !== 'string') continue

      const token = w.word.trim()
      if (!token) continue

      // Clean punctuation for matching while keeping punctuatedText
      const cleanText = token.replace(/^[^\w]+|[^\w]+$/g, '') || token

      let start = typeof w.start === 'number' && !isNaN(w.start) ? Math.max(0, w.start) : lastEnd
      let end = typeof w.end === 'number' && !isNaN(w.end) ? Math.max(start, w.end) : start + 0.2

      // Enforce temporal monotonicity
      if (start < lastEnd) {
        start = lastEnd
        if (end < start) end = start + 0.1
      }

      lastEnd = end
      if (end > maxEnd) maxEnd = end

      normalizedWords.push({
        text: cleanText,
        start: Math.round(start * 1000) / 1000,
        end: Math.round(end * 1000) / 1000,
        confidence: null,
        punctuatedText: token,
      })
    }

    const durationSeconds = Math.round(Math.max(maxEnd, lastEnd) * 1000) / 1000

    return NormalizedTranscriptSchema.parse({
      text: rawText,
      words: normalizedWords,
      language: raw?.language || 'en',
      durationSeconds,
      provider,
    })
  }

  /**
   * Sanitizes and validates arbitrary user-provided or fallback transcript text.
   */
  public static fromTextOnly(text: string, durationSeconds: number = 0): NormalizedTranscript {
    const trimmed = text.trim()
    const tokens = trimmed.split(/\s+/).filter(Boolean)

    // For text-only inputs, word-level acoustic timestamps do not exist.
    // Rather than fabricating fake timestamps, words are marked with null or start=0, end=0
    const words: NormalizedWord[] = tokens.map((token) => ({
      text: token.replace(/^[^\w]+|[^\w]+$/g, '') || token,
      start: 0,
      end: 0,
      confidence: null,
      punctuatedText: token,
    }))

    return NormalizedTranscriptSchema.parse({
      text: trimmed,
      words,
      language: 'en',
      durationSeconds,
      provider: 'user-text-input',
    })
  }
}
