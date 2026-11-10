import { test } from 'node:test'
import assert from 'node:assert/strict'
import { statsFor, streakDays } from './progress.ts'

const day = (d: number, h = 12) => new Date(2026, 10, d, h)
const today = day(10)

test('streak counts consecutive days ending today', () => {
  assert.equal(streakDays([day(10), day(9), day(8), day(6)], today), 3)
})

test('streak survives until midnight if today is not done yet', () => {
  assert.equal(streakDays([day(9), day(8)], today), 2)
})

test('streak is broken by a missed day', () => {
  assert.equal(streakDays([day(8), day(7)], today), 0)
  assert.equal(streakDays([], today), 0)
})

test('multiple sessions on one day count once, across month boundary', () => {
  assert.equal(streakDays([day(1, 9), day(1, 22), new Date(2026, 9, 31, 8)], day(1)), 2)
})

test('stats', () => {
  const h = (score: number, d: number) => ({ id: '', topic: '', minutes: 20, level: '', score, gradedAt: day(d).toISOString() })
  assert.deepEqual(statsFor([h(80, 10), h(60, 9)], today), { streak: 2, sessions: 2, average: 70, best: 80 })
  assert.deepEqual(statsFor([], today), { streak: 0, sessions: 0, average: 0, best: 0 })
})
