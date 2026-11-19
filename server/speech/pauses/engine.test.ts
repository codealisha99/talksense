import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PauseAnalysisEngine } from './engine.ts'
import { computePauseDiagnostics } from './statistics.ts'
import type { NormalizedTranscript } from '../../../src/speech.ts'

test('PauseAnalysisEngine detects inter-word gaps and classifies grammatical vs hesitation pauses', () => {
  const engine = new PauseAnalysisEngine()

  // Sentence 1: "The result," [pause 0.6s -> grammatical] "is clear." [pause 1.8s -> long silence]
  // Sentence 2: "Because" [pause 0.7s -> hesitation after conjunction] "we tested it."
  const transcript: NormalizedTranscript = {
    text: 'The result, is clear. Because we tested it.',
    language: 'en',
    durationSeconds: 10.0,
    provider: 'test',
    words: [
      { text: 'The', start: 0.1, end: 0.3, confidence: null },
      { text: 'result', punctuatedText: 'result,', start: 0.35, end: 0.7, confidence: null },
      // Gap 1: 0.7s to 1.3s = 0.6s gap after comma -> GRAMMATICAL_PAUSE
      { text: 'is', start: 1.3, end: 1.5, confidence: null },
      { text: 'clear', punctuatedText: 'clear.', start: 1.55, end: 1.9, confidence: null },
      // Gap 2: 1.9s to 3.7s = 1.8s gap -> LONG_SILENCE
      { text: 'Because', start: 3.7, end: 4.1, confidence: null },
      // Gap 3: 4.1s to 4.8s = 0.7s gap mid-clause after conjunction -> HESITATION_PAUSE
      { text: 'we', start: 4.8, end: 5.0, confidence: null },
      { text: 'tested', start: 5.05, end: 5.4, confidence: null },
      { text: 'it', punctuatedText: 'it.', start: 5.45, end: 5.7, confidence: null },
    ],
  }

  const metrics = engine.analyze(transcript, 10.0)

  assert.equal(metrics.totalPauses, 3)
  assert.equal(metrics.events[0].category, 'GRAMMATICAL_PAUSE')
  assert.equal(metrics.events[0].durationSeconds, 0.6)

  assert.equal(metrics.events[1].category, 'LONG_SILENCE')
  assert.equal(metrics.events[1].durationSeconds, 1.8)

  assert.equal(metrics.events[2].category, 'HESITATION_PAUSE')
  assert.equal(metrics.events[2].durationSeconds, 0.7)

  // Distribution check
  assert.equal(metrics.distribution.moderateCount, 2) // 0.6s and 0.7s
  assert.equal(metrics.distribution.longCount, 1) // 1.8s

  // Silence ratio check (3.1s pauses in 10s audio = 0.31)
  assert.equal(metrics.silenceRatio, 0.31)
})

test('computePauseDiagnostics evaluates phonation ratio and awkward pauses', () => {
  const engine = new PauseAnalysisEngine()

  const transcript: NormalizedTranscript = {
    text: 'I think that this works.',
    language: 'en',
    durationSeconds: 8.0,
    provider: 'test',
    words: [
      { text: 'I', start: 0.2, end: 0.4, confidence: null },
      { text: 'think', start: 0.45, end: 0.7, confidence: null },
      // Awkward hesitation of 2.2s
      { text: 'that', start: 2.9, end: 3.2, confidence: null },
      { text: 'this', start: 3.25, end: 3.5, confidence: null },
      { text: 'works', punctuatedText: 'works.', start: 3.55, end: 4.0, confidence: null },
    ],
  }

  const metrics = engine.analyze(transcript, 8.0)
  const diagnostics = computePauseDiagnostics(metrics, 8.0)

  assert.ok(diagnostics.phonationRatio < 1.0)
  assert.equal(diagnostics.awkwardPauseCount, 1)
  assert.equal(diagnostics.longestHesitation?.category, 'LONG_SILENCE')
})
