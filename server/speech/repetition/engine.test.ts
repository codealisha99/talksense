import { test } from 'node:test'
import assert from 'node:assert/strict'
import { RepetitionDetectionEngine } from './engine.ts'
import type { NormalizedTranscript } from '../../../src/speech.ts'

const makeWords = (words: string[]): NormalizedTranscript => ({
  text: words.join(' '),
  language: 'en',
  durationSeconds: words.length * 0.5,
  provider: 'test',
  words: words.map((w, i) => ({
    text: w.replace(/[^\w]/g, ''),
    punctuatedText: w,
    start: i * 0.5,
    end: i * 0.5 + 0.4,
    confidence: null,
  })),
})

test('RepetitionDetectionEngine detects consecutive word stutters vs intentional emphasis', () => {
  const engine = new RepetitionDetectionEngine()

  // 1. Unintentional stutter: "I think think that"
  const stutterTranscript = makeWords(['I', 'think', 'think', 'that'])
  const m1 = engine.analyze(stutterTranscript)
  assert.equal(m1.lexicalCount, 1)
  assert.equal(m1.events[0].type, 'LEXICAL_CONSECUTIVE')
  assert.equal(m1.events[0].isIntentionalEmphasis, false)

  // 2. Intentional rhetorical emphasis: "It is very very important"
  const emphasisTranscript = makeWords(['It', 'is', 'very', 'very', 'important'])
  const m2 = engine.analyze(emphasisTranscript)
  // Intentional emphasis should be flagged and excluded from the penalized lexicalCount
  assert.equal(m2.lexicalCount, 0)
  assert.equal(m2.events[0].isIntentionalEmphasis, true)
})

test('RepetitionDetectionEngine detects multi-word phrase restarts', () => {
  const engine = new RepetitionDetectionEngine()

  // "We need to we need to focus on this."
  const transcript = makeWords(['We', 'need', 'to', 'we', 'need', 'to', 'focus', 'on', 'this.'])
  const metrics = engine.analyze(transcript)

  assert.ok(metrics.lexicalCount >= 1)
  const restart = metrics.events.find((e) => e.type === 'LEXICAL_RESTART')
  assert.ok(restart)
  assert.equal(restart.phrase, 'We need to')
})

test('RepetitionDetectionEngine detects semantic repetition across duplicate sentences', () => {
  const engine = new RepetitionDetectionEngine()

  const transcript: NormalizedTranscript = {
    text: 'Artificial intelligence transforms modern healthcare delivery. Machine intelligence transforms modern healthcare delivery.',
    language: 'en',
    durationSeconds: 10.0,
    provider: 'test',
    words: [
      { text: 'Artificial', start: 0, end: 0.5, confidence: null },
      { text: 'intelligence', start: 0.55, end: 1.0, confidence: null },
      { text: 'transforms', start: 1.05, end: 1.5, confidence: null },
      { text: 'modern', start: 1.55, end: 1.9, confidence: null },
      { text: 'healthcare', start: 1.95, end: 2.4, confidence: null },
      { text: 'delivery', punctuatedText: 'delivery.', start: 2.45, end: 2.9, confidence: null },
      { text: 'Machine', start: 3.5, end: 4.0, confidence: null },
      { text: 'intelligence', start: 4.05, end: 4.5, confidence: null },
      { text: 'transforms', start: 4.55, end: 5.0, confidence: null },
      { text: 'modern', start: 5.05, end: 5.4, confidence: null },
      { text: 'healthcare', start: 5.45, end: 5.9, confidence: null },
      { text: 'delivery', punctuatedText: 'delivery.', start: 5.95, end: 6.4, confidence: null },
    ],
  }

  const metrics = engine.analyze(transcript)
  assert.ok(metrics.semanticCount >= 1)
  const sem = metrics.events.find((e) => e.type === 'SEMANTIC_REPETITION')
  assert.ok(sem)
})
