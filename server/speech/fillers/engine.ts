import type {
  FillerMetrics,
  FillerOccurrence,
  NormalizedTranscript,
} from '../../../src/speech.ts'
import { FillerCandidateMatcher } from './matcher.ts'
import { FillerContextClassifier } from './classifier.ts'
import type { FillerEntry } from './dictionary.ts'

export class FillerDetectionEngine {
  private readonly matcher: FillerCandidateMatcher
  private readonly classifier: FillerContextClassifier

  constructor(customDictionary?: FillerEntry[]) {
    this.matcher = new FillerCandidateMatcher(customDictionary)
    this.classifier = new FillerContextClassifier()
  }

  public analyze(transcript: NormalizedTranscript): FillerMetrics {
    const words = transcript.words
    if (words.length === 0) {
      return {
        totalCount: 0,
        confirmedCount: 0,
        discourseMarkerCount: 0,
        fillersPer100Words: 0,
        occurrences: [],
        frequencyByType: {},
        timelineDistribution: [],
      }
    }

    const candidates = this.matcher.findCandidates(words)
    const occurrences: FillerOccurrence[] = []
    const frequencyByType: Record<string, number> = {}
    const timelineBuckets: Map<number, number> = new Map()

    let confirmedCount = 0
    let discourseMarkerCount = 0

    for (const cand of candidates) {
      const result = this.classifyCandidate(cand, words)

      // Surrounding transcript context for UI display (5 words before, 5 words after)
      const contextStart = Math.max(0, cand.startIndex - 4)
      const contextEnd = Math.min(words.length, cand.endIndex + 5)
      const surroundingContext = words
        .slice(contextStart, contextEnd)
        .map((w, idx) => {
          const globalIdx = contextStart + idx
          if (globalIdx >= cand.startIndex && globalIdx <= cand.endIndex) {
            return `[${w.punctuatedText || w.text}]`
          }
          return w.punctuatedText || w.text
        })
        .join(' ')

      const occurrence: FillerOccurrence = {
        id: `f-${cand.startIndex}-${Math.round(cand.start * 100)}`,
        token: cand.matchedText,
        canonical: cand.entry.canonical,
        classification: result.classification,
        start: cand.start,
        end: cand.end,
        wordIndex: cand.startIndex,
        surroundingContext,
        detectionMethod: cand.entry.unconditionalFiller ? 'ACOUSTIC_LEXICAL' : 'CONTEXTUAL_SYNTAX',
        confidence: result.confidence,
        reason: result.reason,
      }

      occurrences.push(occurrence)

      if (result.classification === 'CONFIRMED_FILLER') {
        confirmedCount++
        frequencyByType[cand.entry.canonical] = (frequencyByType[cand.entry.canonical] ?? 0) + 1

        const secondBucket = Math.floor(cand.start / 10) * 10
        timelineBuckets.set(secondBucket, (timelineBuckets.get(secondBucket) ?? 0) + 1)
      } else if (result.classification === 'DISCOURSE_MARKER') {
        discourseMarkerCount++
      }
    }

    // Rate of confirmed fillers per 100 words spoken
    const fillersPer100Words = words.length > 0
      ? Math.round((confirmedCount / words.length) * 1000) / 10
      : 0

    const timelineDistribution = Array.from(timelineBuckets.entries())
      .sort(([a], [b]) => a - b)
      .map(([secondBucket, count]) => ({ secondBucket, count }))

    return {
      totalCount: occurrences.length,
      confirmedCount,
      discourseMarkerCount,
      fillersPer100Words,
      occurrences,
      frequencyByType,
      timelineDistribution,
    }
  }

  private classifyCandidate(candidate: any, words: any) {
    return this.classifier.classify(candidate, words)
  }
}
