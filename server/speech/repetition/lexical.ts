import type { NormalizedWord, RepetitionEvent } from '../../../src/speech.ts'

const EMPHASIS_EXCEPTIONS = new Set(['very', 'really', 'much', 'more', 'again', 'no', 'never'])

/**
 * Detects consecutive repeated words, false starts, and phrase restarts.
 */
export class LexicalRepetitionDetector {
  public detect(words: NormalizedWord[]): RepetitionEvent[] {
    const events: RepetitionEvent[] = []
    const n = words.length
    if (n < 2) return events

    const visitedIndices = new Set<number>()

    // 1. Detect multi-word phrase restarts (2-word to 4-word phrases repeated immediately)
    for (let len = 4; len >= 2; len--) {
      for (let i = 0; i <= n - 2 * len; i++) {
        if (visitedIndices.has(i)) continue

        let match = true
        for (let k = 0; k < len; k++) {
          if (words[i + k].text.toLowerCase() !== words[i + len + k].text.toLowerCase()) {
            match = false
            break
          }
        }

        if (match) {
          const phrase = words.slice(i, i + len).map((w) => w.text).join(' ')
          const start = words[i].start
          const end = words[i + 2 * len - 1].end

          events.push({
            id: `rep-phrase-${i}-${len}`,
            type: 'LEXICAL_RESTART',
            phrase,
            start,
            end,
            startIndex: i,
            endIndex: i + 2 * len - 1,
            confidence: 0.95,
            reason: `Immediate phrase restart: "${phrase}" repeated.`,
            isIntentionalEmphasis: false,
          })

          for (let m = i; m < i + 2 * len; m++) visitedIndices.add(m)
        }
      }
    }

    // 2. Detect single-word consecutive repetitions
    for (let i = 0; i < n - 1; i++) {
      if (visitedIndices.has(i)) continue

      const cur = words[i]
      const next = words[i + 1]

      if (cur.text.toLowerCase() === next.text.toLowerCase()) {
        const lower = cur.text.toLowerCase()
        const isEmphasis = EMPHASIS_EXCEPTIONS.has(lower)

        events.push({
          id: `rep-word-${i}`,
          type: 'LEXICAL_CONSECUTIVE',
          phrase: `${cur.text} ${next.text}`,
          start: cur.start,
          end: next.end,
          startIndex: i,
          endIndex: i + 1,
          confidence: isEmphasis ? 0.6 : 0.95,
          reason: isEmphasis
            ? `Consecutive repetition of "${cur.text}" likely used for intentional rhetorical emphasis.`
            : `Stuttered consecutive repetition of "${cur.text}".`,
          isIntentionalEmphasis: isEmphasis,
        })

        visitedIndices.add(i)
        visitedIndices.add(i + 1)
      }
    }

    return events
  }
}
