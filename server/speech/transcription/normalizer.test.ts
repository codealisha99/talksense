import { test } from 'node:test'
import assert from 'node:assert/strict'
import { TranscriptionNormalizer } from './normalizer.ts'

test('TranscriptionNormalizer cleans tokens, preserves punctuation, and sets duration', () => {
  const raw = {
    text: 'Hello, world! We are testing.',
    language: 'en',
    duration: 3.5,
    words: [
      { word: 'Hello,', start: 0.2, end: 0.6 },
      { word: 'world!', start: 0.7, end: 1.1 },
      { word: 'We', start: 1.5, end: 1.7 },
      { word: 'are', start: 1.8, end: 2.0 },
      { word: 'testing.', start: 2.1, end: 2.8 },
    ],
  }

  const normalized = TranscriptionNormalizer.normalizeWhisper(raw)
  assert.equal(normalized.words.length, 5)
  assert.equal(normalized.words[0].text, 'Hello')
  assert.equal(normalized.words[0].punctuatedText, 'Hello,')
  assert.equal(normalized.words[1].text, 'world')
  assert.equal(normalized.words[1].punctuatedText, 'world!')
  assert.equal(normalized.durationSeconds, 3.5)
})

test('TranscriptionNormalizer enforces temporal monotonicity on jittered timestamps', () => {
  const raw = {
    text: 'one two three',
    duration: 3.0,
    words: [
      { word: 'one', start: 0.5, end: 1.2 },
      { word: 'two', start: 1.0, end: 1.5 }, // Start overlaps previous end!
      { word: 'three', start: 1.4, end: 2.0 },
    ],
  }

  const normalized = TranscriptionNormalizer.normalizeWhisper(raw)
  assert.equal(normalized.words[0].start, 0.5)
  assert.equal(normalized.words[0].end, 1.2)
  assert.ok(normalized.words[1].start >= normalized.words[0].end)
  assert.ok(normalized.words[2].start >= normalized.words[1].end)
})

test('TranscriptionNormalizer handles missing or NaN timestamps gracefully', () => {
  const raw = {
    text: 'test word',
    words: [
      { word: 'test', start: NaN as any, end: undefined as any },
      { word: 'word', start: 1.0, end: 1.5 },
    ],
  }

  const normalized = TranscriptionNormalizer.normalizeWhisper(raw)
  assert.equal(normalized.words.length, 2)
  assert.equal(normalized.words[0].start, 0)
  assert.ok(normalized.words[0].end > 0)
})

test('TranscriptionNormalizer.fromTextOnly creates structured output without fabricating timestamps', () => {
  const text = 'Quick explanation without voice audio'
  const normalized = TranscriptionNormalizer.fromTextOnly(text, 10.0)

  assert.equal(normalized.words.length, 5)
  assert.equal(normalized.words[0].text, 'Quick')
  assert.equal(normalized.words[0].start, 0)
  assert.equal(normalized.words[0].end, 0)
  assert.equal(normalized.provider, 'user-text-input')
})
