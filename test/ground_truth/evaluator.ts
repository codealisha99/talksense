import type { FillerOccurrence, SpeakingPaceMetrics, PauseMetrics, RepetitionMetrics, GrammarIssue } from '../../src/speech.ts'
import type { GroundTruthSample } from './dataset.ts'

export type EvaluationMetrics = {
  precision: number
  recall: number
  f1: number
  truePositives: number
  falsePositives: number
  falseNegatives: number
}

export function computePrecisionRecallF1(tp: number, fp: number, fn: number): EvaluationMetrics {
  const precision = tp + fp > 0 ? Math.round((tp / (tp + fp)) * 1000) / 1000 : 1.0
  const recall = tp + fn > 0 ? Math.round((tp / (tp + fn)) * 1000) / 1000 : 1.0
  const f1 = precision + recall > 0 ? Math.round(((2 * precision * recall) / (precision + recall)) * 1000) / 1000 : 1.0

  return {
    precision,
    recall,
    f1,
    truePositives: tp,
    falsePositives: fp,
    falseNegatives: fn,
  }
}

export class SpeechBenchmarkEvaluator {
  public evaluateFillers(
    actual: FillerOccurrence[],
    expected: GroundTruthSample['expected']['fillers'],
  ): EvaluationMetrics {
    // Only count CONFIRMED_FILLER and DISCOURSE_MARKER as positive detections; MEANINGFUL_USAGE should not be counted as a filler
    const actualPositives = actual.filter((a) => a.classification !== 'MEANINGFUL_USAGE')
    const expectedPositives = expected.filter((e) => e.classification !== 'MEANINGFUL_USAGE')

    let tp = 0
    let fp = 0
    let fn = 0

    const matchedExpectedIndices = new Set<number>()

    for (const act of actualPositives) {
      const matchIndex = expectedPositives.findIndex(
        (exp, idx) =>
          !matchedExpectedIndices.has(idx) &&
          (exp.token.toLowerCase() === act.token.toLowerCase() || exp.token.toLowerCase() === act.canonical.toLowerCase()) &&
          Math.abs(exp.startIndex - act.wordIndex) <= 1,
      )

      if (matchIndex !== -1) {
        tp++
        matchedExpectedIndices.add(matchIndex)
      } else {
        fp++
      }
    }

    fn = expectedPositives.length - matchedExpectedIndices.size

    return computePrecisionRecallF1(tp, fp, fn)
  }

  public evaluatePace(
    actual: SpeakingPaceMetrics,
    expected: GroundTruthSample['expected']['pace'],
  ): { isWithinRange: boolean; tempoMatch: boolean; overallWpm: number } {
    const isWithinRange = actual.overallWpm >= expected.minWpm && actual.overallWpm <= expected.maxWpm
    const tempoMatch = actual.tempoStatus === expected.tempoStatus
    return {
      isWithinRange,
      tempoMatch,
      overallWpm: actual.overallWpm,
    }
  }

  public evaluatePauses(
    actual: PauseMetrics,
    expected: GroundTruthSample['expected']['pauses'],
  ): { meetsMinCount: boolean; hesitationCount: number; expectedHesitations: number } {
    const hesitations = actual.events.filter(
      (e) => e.category === 'HESITATION_PAUSE' || e.category === 'LONG_SILENCE',
    ).length
    return {
      meetsMinCount: actual.totalPauses >= expected.minCount,
      hesitationCount: hesitations,
      expectedHesitations: expected.expectedHesitationCount,
    }
  }

  public evaluateRepetitions(
    actual: RepetitionMetrics,
    expected: GroundTruthSample['expected']['repetitions'],
  ): { meetsMinCount: boolean; detectedCount: number } {
    return {
      meetsMinCount: actual.totalCount >= expected.minCount,
      detectedCount: actual.totalCount,
    }
  }

  public evaluateGrammar(
    actual: GrammarIssue[],
    expected: GroundTruthSample['expected']['grammar'],
  ): { meetsMinCount: boolean; detectedIssues: number } {
    return {
      meetsMinCount: actual.length >= expected.minIssues,
      detectedIssues: actual.length,
    }
  }
}
