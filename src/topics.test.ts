import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ANGLES, NICHES, randomTopicPrompt } from './topics.ts'

test('chosen niche is respected', () => {
  const { area, prompt } = randomTopicPrompt('Cooking', [], () => 0.99)
  assert.equal(area, 'Cooking')
  assert.match(prompt.user, /^Area: Cooking\nAngle: /)
})

test('"any" picks area and angle from the random source, including edge values', () => {
  assert.equal(randomTopicPrompt(null, [], () => 0).area, NICHES[0])
  assert.equal(randomTopicPrompt(null, [], () => 0.999999).area, NICHES[NICHES.length - 1])
  assert.ok(randomTopicPrompt(null, [], () => 0.5).prompt.user.includes(ANGLES[Math.floor(0.5 * ANGLES.length)]))
})

test('past topics are passed as an avoid list', () => {
  const { prompt } = randomTopicPrompt('Music', ['Why minor chords sound sad'])
  assert.ok(prompt.user.includes('- Why minor chords sound sad'))
  assert.ok(!randomTopicPrompt('Music', []).prompt.user.includes('Do not repeat'))
})
