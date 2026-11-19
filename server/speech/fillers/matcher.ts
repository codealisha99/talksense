import type { NormalizedWord } from '../../../src/speech.ts'
import { FILLER_DICTIONARY, type FillerEntry } from './dictionary.ts'

export type CandidateMatch = {
  entry: FillerEntry
  startIndex: number
  endIndex: number
  matchedWords: NormalizedWord[]
  matchedText: string
  start: number
  end: number
}

/**
 * Scans a stream of normalized words to identify single- and multi-word filler candidates.
 */
export class FillerCandidateMatcher {
  private readonly dictionary: FillerEntry[]

  constructor(customDictionary?: FillerEntry[]) {
    this.dictionary = customDictionary ?? FILLER_DICTIONARY
  }

  public findCandidates(words: NormalizedWord[]): CandidateMatch[] {
    const candidates: CandidateMatch[] = []
    const n = words.length

    for (let i = 0; i < n; i++) {
      // Check multi-word entries (e.g. 2 tokens: "you know", "kind of")
      for (const entry of this.dictionary) {
        const tokens = entry.tokens
        if (tokens.length === 1) continue

        if (i + tokens.length <= n) {
          let match = true
          for (let t = 0; t < tokens.length; t++) {
            if (words[i + t].text.toLowerCase() !== tokens[t].toLowerCase()) {
              match = false
              break
            }
          }

          if (match) {
            const matchedWords = words.slice(i, i + tokens.length)
            candidates.push({
              entry,
              startIndex: i,
              endIndex: i + tokens.length - 1,
              matchedWords,
              matchedText: matchedWords.map((w) => w.punctuatedText || w.text).join(' '),
              start: matchedWords[0].start,
              end: matchedWords[matchedWords.length - 1].end,
            })
          }
        }
      }

      // Check single-word entries (e.g. "um", "like")
      const currentToken = words[i].text.toLowerCase()
      for (const entry of this.dictionary) {
        if (entry.tokens.length === 1 && entry.tokens[0].toLowerCase() === currentToken) {
          candidates.push({
            entry,
            startIndex: i,
            endIndex: i,
            matchedWords: [words[i]],
            matchedText: words[i].punctuatedText || words[i].text,
            start: words[i].start,
            end: words[i].end,
          })
        }
      }
    }

    return candidates
  }
}
