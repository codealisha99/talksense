import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SpeakingPaceEngine } from './engine.ts'
import type { NormalizedTranscript } from '../../../src/speech.ts'

test('SpeakingPaceEngine accurately calculates overall and active WPM by excluding long pauses', () => {
  const engine = new SpeakingPaceEngine({ pauseExclusionThresholdSeconds: 0.5 })

  // 10 words spoken across 10 seconds total, but with a 4.0-second silence in the middle
  // Word 1-5: 0.0s to 2.5s (2.5s)
  // Silence: 2.5s to 6.5s (4.0s pause)
  // Word 6-10: 6.5s to 9.5s (3.0s)
  // Total duration: 10.0s
  // Active speaking duration: 10.0 - 4.0 - 0.5 (trailing) = 5.5s
  const transcript: NormalizedTranscript = {
    text: 'one two three four five six seven eight nine ten',
    language: 'en',
    durationSeconds: 10.0,
    provider: 'test',
    words: [
      { text: 'one', start: 0.0, end: 0.4, confidence: null },
      { text: 'two', start: 0.5, end: 0.9, confidence: null },
      { text: 'three', start: 1.0, end: 1.4, confidence: null },
      { text: 'four', start: 1.5, end: 1.9, confidence: null },
      { text: 'five', start: 2.0, end: 2.5, confidence: null },
      // 4-second silence here!
      { text: 'six', start: 6.5, end: 7.0, confidence: null },
      { text: 'seven', start: 7.1, end: 7.5, confidence: null },
      { text: 'eight', start: 7.6, end: 8.0, confidence: null },
      { text: 'nine', start: 8.1, end: 8.5, confidence: null },
      { text: 'ten', start: 8.6, end: 9.5, confidence: null },
    ],
  }

  const metrics = engine.analyze(transcript, 10.0)

  // Overall WPM = 10 words / (10s / 60s) = 60 WPM
  assert.equal(metrics.overallWpm, 60)

  // Active speaking duration should be significantly lower than 10s (5.5s)
  assert.ok(metrics.activeSpeakingDurationSeconds < 6.0)
  assert.ok(metrics.activeSpeakingDurationSeconds >= 5.0)

  // Active WPM = 10 / (5.5 / 60) ≈ 109 WPM
  assert.ok(metrics.activeWpm > metrics.overallWpm)
  assert.ok(metrics.activeWpm > 100)
})

test('SpeakingPaceEngine correctly classifies tempo according to thresholds', () => {
  const engine = new SpeakingPaceEngine()

  assert.equal(engine.classifyTempo(95), 'VERY_SLOW')
  assert.equal(engine.classifyTempo(120), 'SLOW')
  assert.equal(engine.classifyTempo(145), 'MODERATE')
  assert.equal(engine.classifyTempo(175), 'FAST')
  assert.equal(engine.classifyTempo(210), 'VERY_FAST')
})

test('SpeakingPaceEngine generates segment-level rolling pace windows', () => {
  const engine = new SpeakingPaceEngine()

  // 120 words across 60 seconds (60 words in first 30s, 60 words in second 30s)
  const words = Array.from({ length: 60 }, (_, i) => ({
    text: `word${i}`,
    start: i * 0.45,
    end: i * 0.45 + 0.4,
    confidence: null,
  }))

  const segments = engine.calculateSegments(words, 60, 30)
  assert.equal(segments.length, 2)
  assert.equal(segments[0].startSecond, 0)
  assert.equal(segments[0].endSecond, 30)
  assert.ok(segments[0].wordsCount > 0)
  assert.ok(segments[0].wpm > 0)
})

test('SpeakingPaceEngine handles edge cases: empty transcript, zero duration, single word', () => {
  const engine = new SpeakingPaceEngine()

  // 1. Empty transcript
  const emptyTranscript: NormalizedTranscript = {
    text: '',
    language: 'en',
    durationSeconds: 0,
    provider: 'test',
    words: [],
  }
  const emptyMetrics = engine.analyze(emptyTranscript, 0)
  assert.equal(emptyMetrics.overallWpm, 0)
  assert.equal(emptyMetrics.activeWpm, 0)
  assert.equal(emptyMetrics.tempoStatus, 'VERY_SLOW')

  // 2. Single word in 60-second audio
  const singleWordTranscript: NormalizedTranscript = {
    text: 'Hello',
    language: 'en',
    durationSeconds: 60.0,
    provider: 'test',
    words: [{ text: 'Hello', start: 10.0, end: 10.5, confidence: null }],
  }
  const singleMetrics = engine.analyze(singleWordTranscript, 60.0)
  assert.equal(singleMetrics.overallWpm, 1) // 1 word in 1 minute = 1 WPM
  assert.ok(singleMetrics.activeSpeakingDurationSeconds <= 1.0)
})
