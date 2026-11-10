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
  const h = (score: number, d: number) => ({ id: '', topic: '', minutes: 20, level: '', score, gradedAt: day(d).toISOString(), dimensions: { coverage: 0, accuracy: 0, depth: 0, clarity: 0 } })
  assert.deepEqual(statsFor([h(80, 10), h(60, 9)], today), { streak: 2, sessions: 2, average: 70, best: 80 })
  assert.deepEqual(statsFor([], today), { streak: 0, sessions: 0, average: 0, best: 0 })
})

import { activityDays, dimensionAverages, scoreTrend, weakestDimension } from './progress.ts'

const item = (score: number, d: number, dims: [number, number, number, number]) => ({
  id: String(d), topic: 't', minutes: 20, level: 'x', score, gradedAt: day(d).toISOString(),
  dimensions: { coverage: dims[0], accuracy: dims[1], depth: dims[2], clarity: dims[3] },
})

test('dimension averages are 0-4 means per rubric part', () => {
  const avg = dimensionAverages([item(70, 10, [4, 3, 1, 2]), item(60, 9, [2, 3, 3, 2])])
  assert.deepEqual(avg, { coverage: 3, accuracy: 3, depth: 2, clarity: 2 })
  assert.equal(dimensionAverages([]), null)
})

test('weakest dimension breaks ties by rubric weight (the costlier gap first)', () => {
  // depth and clarity tie at 2; depth carries more weight (20% vs 15%) so it is the better focus.
  assert.equal(weakestDimension({ coverage: 3, accuracy: 3, depth: 2, clarity: 2 }), 'depth')
  assert.equal(weakestDimension({ coverage: 1, accuracy: 3, depth: 2, clarity: 2 }), 'coverage')
})

test('score trend is oldest-first and capped', () => {
  const h = [item(90, 10, [4, 4, 4, 4]), item(50, 9, [2, 2, 2, 2]), item(70, 8, [3, 3, 3, 3])]
  assert.deepEqual(scoreTrend(h, 2), [50, 90])
  assert.deepEqual(scoreTrend(h, 10), [70, 50, 90])
})

test('activity days: one cell per day for N weeks ending today, counting sessions', () => {
  const days = activityDays([item(1, 10, [0, 0, 0, 0]), item(1, 10, [0, 0, 0, 0]), item(1, 8, [0, 0, 0, 0])], 2, today)
  assert.equal(days.length, 14)
  assert.deepEqual(days.at(-1), { key: '2026-11-10', count: 2 })
  assert.equal(days.at(-3)?.count, 1)
  assert.equal(days[0].key, '2026-10-28')
})
