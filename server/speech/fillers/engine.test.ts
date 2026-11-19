import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FillerDetectionEngine } from './engine.ts'
import type { NormalizedTranscript } from '../../../src/speech.ts'

const makeTranscript = (wordsArr: { text: string; punct?: string; start: number; end: number }[]): NormalizedTranscript => ({
  text: wordsArr.map((w) => w.punct || w.text).join(' '),
  language: 'en',
  durationSeconds: wordsArr[wordsArr.length - 1]?.end ?? 0,
  provider: 'test',
  words: wordsArr.map((w) => ({
    text: w.text,
    punctuatedText: w.punct || w.text,
    start: w.start,
    end: w.end,
    confidence: null,
  })),
})

test('FillerDetectionEngine flags unconditional fillers ("um", "uh") as CONFIRMED_FILLER', () => {
  const engine = new FillerDetectionEngine()
  const transcript = makeTranscript([
    { text: 'I', start: 0, end: 0.2 },
    { text: 'was', punct: 'was,', start: 0.25, end: 0.5 },
    { text: 'um', punct: 'um,', start: 0.6, end: 0.9 },
    { text: 'thinking', start: 1.0, end: 1.4 },
    { text: 'about', start: 1.45, end: 1.8 },
    { text: 'the', start: 1.85, end: 2.0 },
    { text: 'problem', punct: 'problem.', start: 2.05, end: 2.5 },
  ])

  const metrics = engine.analyze(transcript)
  assert.equal(metrics.confirmedCount, 1)

  const occurrence = metrics.occurrences.find((o) => o.canonical === 'um')
  assert.ok(occurrence)
  assert.equal(occurrence.classification, 'CONFIRMED_FILLER')
})

test('FillerDetectionEngine accurately classifies "I like machine learning" as MEANINGFUL_USAGE', () => {
  const engine = new FillerDetectionEngine()
  const transcript = makeTranscript([
    { text: 'I', start: 0, end: 0.2 },
    { text: 'like', start: 0.25, end: 0.5 },
    { text: 'machine', start: 0.55, end: 0.9 },
    { text: 'learning', punct: 'learning.', start: 0.95, end: 1.4 },
  ])

  const metrics = engine.analyze(transcript)
  // "like" after "I" must NOT be counted as a confirmed filler!
  assert.equal(metrics.confirmedCount, 0)

  const occurrence = metrics.occurrences.find((o) => o.canonical === 'like')
  assert.ok(occurrence)
  assert.equal(occurrence.classification, 'MEANINGFUL_USAGE')
})

test('FillerDetectionEngine identifies parenthetical "like" as CONFIRMED_FILLER', () => {
  const engine = new FillerDetectionEngine()
  const transcript = makeTranscript([
    { text: 'It', start: 0, end: 0.2 },
    { text: 'was', punct: 'was,', start: 0.25, end: 0.5 },
    { text: 'like', punct: 'like,', start: 0.6, end: 0.9 },
    { text: 'totally', start: 1.0, end: 1.4 },
    { text: 'unexpected', punct: 'unexpected.', start: 1.45, end: 2.0 },
  ])

  const metrics = engine.analyze(transcript)
  assert.equal(metrics.confirmedCount, 1)
  const occurrence = metrics.occurrences.find((o) => o.canonical === 'like')
  assert.ok(occurrence)
  assert.equal(occurrence.classification, 'CONFIRMED_FILLER')
})

test('FillerDetectionEngine identifies "Actually, the answer is different" as DISCOURSE_MARKER', () => {
  const engine = new FillerDetectionEngine()
  const transcript = makeTranscript([
    { text: 'Actually', punct: 'Actually,', start: 0, end: 0.4 },
    { text: 'the', start: 0.45, end: 0.6 },
    { text: 'answer', start: 0.65, end: 1.0 },
    { text: 'is', start: 1.05, end: 1.2 },
    { text: 'different', punct: 'different.', start: 1.25, end: 1.7 },
  ])

  const metrics = engine.analyze(transcript)
  // "Actually" should not be counted as an unnecessary filler
  assert.equal(metrics.confirmedCount, 0)
  assert.equal(metrics.discourseMarkerCount, 1)

  const occurrence = metrics.occurrences.find((o) => o.canonical === 'actually')
  assert.ok(occurrence)
  assert.equal(occurrence.classification, 'DISCOURSE_MARKER')
})

test('FillerDetectionEngine distinguishes direct question "Do you know" from filler "you know"', () => {
  const engine = new FillerDetectionEngine()

  // Meaningful: "Do you know how it works?"
  const tMeaningful = makeTranscript([
    { text: 'Do', start: 0, end: 0.2 },
    { text: 'you', start: 0.25, end: 0.4 },
    { text: 'know', start: 0.45, end: 0.7 },
    { text: 'how', start: 0.75, end: 0.9 },
    { text: 'it', start: 0.95, end: 1.1 },
    { text: 'works', punct: 'works?', start: 1.15, end: 1.5 },
  ])
  const m1 = engine.analyze(tMeaningful)
  assert.equal(m1.confirmedCount, 0)
  const o1 = m1.occurrences.find((o) => o.canonical === 'you know')
  assert.ok(o1)
  assert.equal(o1.classification, 'MEANINGFUL_USAGE')

  // Filler: "And then, you know, it failed."
  const tFiller = makeTranscript([
    { text: 'And', start: 0, end: 0.2 },
    { text: 'then', punct: 'then,', start: 0.25, end: 0.5 },
    { text: 'you', start: 0.6, end: 0.8 },
    { text: 'know', punct: 'know,', start: 0.85, end: 1.1 },
    { text: 'it', start: 1.2, end: 1.4 },
    { text: 'failed', punct: 'failed.', start: 1.45, end: 1.9 },
  ])
  const m2 = engine.analyze(tFiller)
  assert.equal(m2.confirmedCount, 1)
  const o2 = m2.occurrences.find((o) => o.canonical === 'you know')
  assert.ok(o2)
  assert.equal(o2.classification, 'CONFIRMED_FILLER')
})
