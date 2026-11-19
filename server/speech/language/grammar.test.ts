import { test } from 'node:test'
import assert from 'node:assert/strict'
import { GrammarAnalyzer } from './grammar.ts'
import type { NormalizedWord } from '../../../src/speech.ts'

const toWords = (text: string): NormalizedWord[] =>
  text.split(/\s+/).map((t, i) => ({
    text: t.replace(/[^\w]/g, ''),
    punctuatedText: t,
    start: i * 0.4,
    end: i * 0.4 + 0.35,
    confidence: null,
  }))

test('GrammarAnalyzer detects subject-verb agreement issues', () => {
  const analyzer = new GrammarAnalyzer()
  const text = 'He have completed the project and they is happy.'
  const words = toWords(text)

  const issues = analyzer.analyzeText(text, words)

  const heHave = issues.find((i) => i.originalText.toLowerCase() === 'he have')
  assert.ok(heHave)
  assert.equal(heHave.suggestedCorrection, 'He has')
  assert.equal(heHave.category, 'SUBJECT_VERB_AGREEMENT')

  const theyIs = issues.find((i) => i.originalText.toLowerCase() === 'they is')
  assert.ok(theyIs)
  assert.equal(theyIs.suggestedCorrection, 'they are')
  assert.equal(theyIs.category, 'SUBJECT_VERB_AGREEMENT')
})

test('GrammarAnalyzer distinguishes ASR homophone artifacts from speaker errors', () => {
  const analyzer = new GrammarAnalyzer()
  const text = 'Their is too much noise in the signal.'
  const words = toWords(text)

  const issues = analyzer.analyzeText(text, words)

  const theirIs = issues.find((i) => i.originalText.toLowerCase() === 'their is')
  assert.ok(theirIs)
  assert.equal(theirIs.category, 'SPEECH_TO_TEXT_ARTIFACT')
  assert.equal(theirIs.isLikelyAsrArtifact, true)
  assert.equal(theirIs.suggestedCorrection, 'there is')
})

test('GrammarAnalyzer handles clean grammatical text without false positives', () => {
  const analyzer = new GrammarAnalyzer()
  const text = 'The neural network processes audio data accurately and efficiently.'
  const words = toWords(text)

  const issues = analyzer.analyzeText(text, words)
  assert.equal(issues.length, 0)
})
