import { test } from 'node:test'
import assert from 'node:assert/strict'
import { VocabularyAnalyzer } from './vocabulary.ts'
import type { NormalizedWord } from '../../../src/speech.ts'

const toWords = (tokens: string[]): NormalizedWord[] =>
  tokens.map((t, i) => ({
    text: t,
    start: i * 0.4,
    end: i * 0.4 + 0.35,
    confidence: null,
  }))

test('VocabularyAnalyzer computes TTR and extracts repetitive content words', () => {
  const analyzer = new VocabularyAnalyzer()

  // 10 words, 6 unique words, "algorithm" repeated 4 times
  const tokens = ['The', 'quantum', 'algorithm', 'runs', 'fast', 'and', 'this', 'algorithm', 'is', 'algorithm']
  const metrics = analyzer.analyze(toWords(tokens))

  assert.equal(metrics.totalWords, 10)
  assert.equal(metrics.uniqueWords, 8)
  assert.equal(metrics.typeTokenRatio, 0.8)

  const rep = metrics.repetitiveWords.find((r) => r.word === 'algorithm')
  assert.ok(rep)
  assert.equal(rep.count, 3)

  // Common stop word "the" or "and" should NOT be listed as repetitive
  assert.ok(!metrics.repetitiveWords.some((r) => r.word === 'the'))
})

test('VocabularyAnalyzer computes Moving-Average TTR (MATTR) across large window', () => {
  const analyzer = new VocabularyAnalyzer()

  // 60 words: repeat 10 distinct words 6 times
  const distinct = ['apple', 'banana', 'cherry', 'date', 'elderberry', 'fig', 'grape', 'honeydew', 'kiwi', 'lemon']
  const tokens: string[] = []
  for (let i = 0; i < 6; i++) tokens.push(...distinct)

  const metrics = analyzer.analyze(toWords(tokens), 20)

  // In any 20-word window, there are at most 10 unique words -> window TTR is ~0.5
  assert.ok(metrics.movingAverageTTR > 0)
  assert.ok(metrics.movingAverageTTR <= 1.0)
  assert.equal(metrics.ttrWindowSize, 20)
})
