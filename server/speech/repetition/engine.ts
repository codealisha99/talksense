import type {
  NormalizedTranscript,
  RepetitionEvent,
  RepetitionMetrics,
} from '../../../src/speech.ts'
import { LexicalRepetitionDetector } from './lexical.ts'
import { LexicalEchoDetector } from './echo.ts'

export class RepetitionDetectionEngine {
  private readonly lexicalDetector: LexicalRepetitionDetector
  private readonly echoDetector: LexicalEchoDetector

  constructor() {
    this.lexicalDetector = new LexicalRepetitionDetector()
    this.echoDetector = new LexicalEchoDetector()
  }

  public analyze(transcript: NormalizedTranscript): RepetitionMetrics {
    const words = transcript.words
    if (words.length < 2) {
      return {
        lexicalCount: 0,
        semanticCount: 0,
        totalCount: 0,
        events: [],
      }
    }

    const lexicalEvents = this.lexicalDetector.detect(words)
    const echoEvents = this.echoDetector.detect(words)
    const semanticEvents = this.detectSemanticRepetition(transcript)

    // Deduplicate overlapping indices
    const allEvents: RepetitionEvent[] = [...lexicalEvents]
    const existingSpans = new Set(lexicalEvents.map((e) => `${e.startIndex}-${e.endIndex}`))

    for (const e of echoEvents) {
      const key = `${e.startIndex}-${e.endIndex}`
      if (!existingSpans.has(key)) {
        allEvents.push(e)
        existingSpans.add(key)
      }
    }

    for (const e of semanticEvents) {
      allEvents.push(e)
    }

    // Sort by timestamp
    allEvents.sort((a, b) => a.start - b.start)

    const lexicalCount = allEvents.filter(
      (e) => e.type !== 'SEMANTIC_REPETITION' && !e.isIntentionalEmphasis,
    ).length
    const semanticCount = semanticEvents.length

    return {
      lexicalCount,
      semanticCount,
      totalCount: lexicalCount + semanticCount,
      events: allEvents,
    }
  }

  /**
   * Identifies clause-level semantic repetition using n-gram overlap.
   */
  public detectSemanticRepetition(transcript: NormalizedTranscript): RepetitionEvent[] {
    const events: RepetitionEvent[] = []
    const rawText = transcript.text
    if (!rawText) return events

    // Split into sentences / clauses
    const sentences = rawText.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 10)
    if (sentences.length < 2) return events

    const getWordSet = (s: string) =>
      new Set(
        s
          .toLowerCase()
          .replace(/[^\w\s]/g, '')
          .split(/\s+/)
          .filter((w) => w.length > 3),
      )

    for (let i = 0; i < sentences.length - 1; i++) {
      const setA = getWordSet(sentences[i])
      if (setA.size < 3) continue

      for (let j = i + 1; j < sentences.length; j++) {
        const setB = getWordSet(sentences[j])
        if (setB.size < 3) continue

        // Compute Jaccard coefficient
        let intersection = 0
        for (const word of setA) {
          if (setB.has(word)) intersection++
        }
        const union = new Set([...setA, ...setB]).size
        const similarity = union > 0 ? intersection / union : 0

        // If >= 65% overlap in content vocabulary across separate clauses
        if (similarity >= 0.65) {
          events.push({
            id: `rep-sem-${i}-${j}`,
            type: 'SEMANTIC_REPETITION',
            phrase: `"${sentences[j]}" echoes earlier point "${sentences[i]}"`,
            start: 0,
            end: 0,
            startIndex: 0,
            endIndex: 0,
            confidence: Math.round(similarity * 100) / 100,
            reason: 'High lexical and conceptual redundancy across sentences without adding new information.',
            isIntentionalEmphasis: false,
          })
        }
      }
    }

    return events
  }
}
