import type { NormalizedWord, RepetitionEvent } from '../../../src/speech.ts'

const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'to', 'in', 'on', 'at', 'of', 'for', 'it', 'and', 'but',
])

/**
 * Detects near-duplicate lexical echo where a content word or short phrase
 * is repeated across a very short gap (1 to 3 intervening words).
 */
export class LexicalEchoDetector {
  public detect(words: NormalizedWord[]): RepetitionEvent[] {
    const events: RepetitionEvent[] = []
    const n = words.length

    for (let i = 0; i < n - 2; i++) {
      const cur = words[i].text.toLowerCase()
      if (STOPWORDS.has(cur) || cur.length < 3) continue

      // Look ahead up to 3 words
      for (let gap = 2; gap <= 4 && i + gap < n; gap++) {
        const target = words[i + gap].text.toLowerCase()
        if (cur === target) {
          const phrase = words.slice(i, i + gap + 1).map((w) => w.text).join(' ')
          events.push({
            id: `rep-echo-${i}-${gap}`,
            type: 'LEXICAL_NEARBY',
            phrase,
            start: words[i].start,
            end: words[i + gap].end,
            startIndex: i,
            endIndex: i + gap,
            confidence: 0.85,
            reason: `Content word "${cur}" echoed within ${gap} words.`,
            isIntentionalEmphasis: false,
          })
          break
        }
      }
    }

    return events
  }
}
