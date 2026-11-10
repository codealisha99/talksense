import type { HistoryItem } from './rubric.ts'

/** Local calendar day, e.g. "2026-11-10". Streaks follow the learner's own timezone. */
export function dayKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${m}-${d}`
}

/** Consecutive days with at least one rated session, ending today (or yesterday, so a streak survives until midnight). */
export function streakDays(dates: Date[], today: Date = new Date()): number {
  const days = new Set(dates.map(dayKey))
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (days.has(dayKey(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export type Stats = { streak: number; sessions: number; average: number; best: number }

export function statsFor(history: HistoryItem[], today: Date = new Date()): Stats {
  const scores = history.map((h) => h.score)
  return {
    streak: streakDays(history.map((h) => new Date(h.gradedAt)), today),
    sessions: history.length,
    average: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
    best: scores.length ? Math.max(...scores) : 0,
  }
}
