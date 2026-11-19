import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SpeechAnalysisPipeline } from '../../server/speech/pipeline.ts'
import { GROUND_TRUTH_DATASET } from './dataset.ts'
import { SpeechBenchmarkEvaluator } from './evaluator.ts'

test('Speech Analysis Benchmark against ground-truth dataset', async () => {
  const pipeline = new SpeechAnalysisPipeline()
  const evaluator = new SpeechBenchmarkEvaluator()

  let totalTp = 0
  let totalFp = 0
  let totalFn = 0

  for (const sample of GROUND_TRUTH_DATASET) {
    const report = await pipeline.run(sample.transcript, {
      sessionId: `benchmark-${sample.id}`,
      recordingId: null,
      audioBuffer: undefined,
      audioPlayableUrl: null,
    })

    // 1. Filler Word Benchmark Evaluation
    const fillerMetrics = evaluator.evaluateFillers(report.fillers.occurrences, sample.expected.fillers)
    totalTp += fillerMetrics.truePositives
    totalFp += fillerMetrics.falsePositives
    totalFn += fillerMetrics.falseNegatives

    // 2. Pace Evaluation
    const paceMetrics = evaluator.evaluatePace(report.pace, sample.expected.pace)
    assert.ok(
      paceMetrics.isWithinRange,
      `Pace WPM for ${sample.id} (${paceMetrics.overallWpm}) outside expected [${sample.expected.pace.minWpm}, ${sample.expected.pace.maxWpm}]`,
    )

    // 3. Pause Evaluation
    const pauseMetrics = evaluator.evaluatePauses(report.pauses, sample.expected.pauses)
    assert.ok(
      pauseMetrics.meetsMinCount,
      `Pauses for ${sample.id} (${report.pauses.totalPauses}) should be >= ${sample.expected.pauses.minCount}`,
    )

    // 4. Repetitions Evaluation
    const repMetrics = evaluator.evaluateRepetitions(report.repetition, sample.expected.repetitions)
    assert.ok(
      repMetrics.meetsMinCount,
      `Repetitions for ${sample.id} (${repMetrics.detectedCount}) should be >= ${sample.expected.repetitions.minCount}`,
    )

    // 5. Spoken Grammar Evaluation
    const grammarMetrics = evaluator.evaluateGrammar(report.language.grammarIssues, sample.expected.grammar)
    assert.ok(
      grammarMetrics.meetsMinCount,
      `Grammar issues for ${sample.id} (${grammarMetrics.detectedIssues}) should be >= ${sample.expected.grammar.minIssues}`,
    )
  }

  // Aggregate Filler Benchmark Precision, Recall, and F1
  const overallPrecision = totalTp + totalFp > 0 ? totalTp / (totalTp + totalFp) : 1.0
  const overallRecall = totalTp + totalFn > 0 ? totalTp / (totalTp + totalFn) : 1.0
  const overallF1 =
    overallPrecision + overallRecall > 0
      ? (2 * overallPrecision * overallRecall) / (overallPrecision + overallRecall)
      : 1.0

  // High precision threshold to prevent false accusations of speech defects
  assert.ok(
    overallPrecision >= 0.8,
    `Overall filler precision (${overallPrecision.toFixed(3)}) must be >= 0.80 to avoid false positives`,
  )
  assert.ok(
    overallRecall >= 0.75,
    `Overall filler recall (${overallRecall.toFixed(3)}) must be >= 0.75 to capture real disfluencies`,
  )
  assert.ok(
    overallF1 >= 0.8,
    `Overall filler F1 score (${overallF1.toFixed(3)}) must be >= 0.80`,
  )
})
