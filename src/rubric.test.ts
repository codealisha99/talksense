import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DIMENSIONS, totalScore, levelFor, wordCount, type Grade } from './rubric.ts'

const dims = (score: number) =>
  Object.fromEntries(DIMENSIONS.map((d) => [d.id, { score, reason: '' }])) as Grade['dimensions']

test('weights sum to 1', () => {
  assert.equal(Math.round(DIMENSIONS.reduce((a, d) => a + d.weight, 0) * 1000), 1000)
})

test('total score is weighted 0-100 and clamps bad model output', () => {
  assert.equal(totalScore(dims(4)), 100)
  assert.equal(totalScore(dims(0)), 0)
  assert.equal(totalScore(dims(2)), 50)
  assert.equal(totalScore(dims(99)), 100)
  assert.equal(totalScore(dims(-5)), 0)
  assert.equal(totalScore({ ...dims(0), coverage: { score: 4, reason: '' } }), 35)
})

test('levels at boundaries', () => {
  assert.equal(levelFor(100), 'Master')
  assert.equal(levelFor(90), 'Master')
  assert.equal(levelFor(89), 'Expert')
  assert.equal(levelFor(60), 'Practitioner')
  assert.equal(levelFor(39), 'Novice')
})

test('word count', () => {
  assert.equal(wordCount('  a  b\nc '), 3)
  assert.equal(wordCount(''), 0)
})

test('studied minutes are measured from start but never exceed the chosen study time', async () => {
  const { studiedMinutes } = await import('./rubric.ts')
  const start = Date.UTC(2026, 10, 10, 9, 0)
  assert.equal(studiedMinutes(start, start + 7 * 60_000, 20), 7) // finished early
  assert.equal(studiedMinutes(start, start + 26 * 60_000, 20), 20) // timer ran out, then spoke for 6 min
  assert.equal(studiedMinutes(start, start + 3 * 86_400_000, 20), 20) // resumed days later
  assert.equal(studiedMinutes(start, start + 10_000, 20), 1) // at least one minute
  assert.equal(studiedMinutes(null, start, 20), null) // timer never started
})
