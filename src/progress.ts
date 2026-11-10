import { DIMENSIONS, type DimensionId, type HistoryItem } from './rubric.ts'

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

export type DimensionScores = Record<DimensionId, number>

/** Mean 0-4 score per rubric part across sessions, or null with no history. */
export function dimensionAverages(history: HistoryItem[]): DimensionScores | null {
  if (!history.length) return null
  const mean = (id: DimensionId) => history.reduce((sum, h) => sum + (h.dimensions?.[id] ?? 0), 0) / history.length
  return Object.fromEntries(DIMENSIONS.map((d) => [d.id, mean(d.id)])) as DimensionScores
}

/** Lowest-scoring rubric part; ties go to the heavier-weighted part, since improving it moves the score most. */
export function weakestDimension(averages: DimensionScores): DimensionId {
  return [...DIMENSIONS].sort((a, b) => averages[a.id] - averages[b.id] || b.weight - a.weight)[0].id
}

/** Most recent `limit` scores, oldest first, for a trend line. History arrives newest first. */
export function scoreTrend(history: HistoryItem[], limit: number): number[] {
  return history.slice(0, limit).map((h) => h.score).reverse()
}

export type ActivityDay = { key: string; count: number }

/** One entry per local day for the last `weeks` weeks (ending today), with the number of rated sessions. */
export function activityDays(history: HistoryItem[], weeks: number, today: Date = new Date()): ActivityDay[] {
  const counts = new Map<string, number>()
  for (const h of history) {
    const key = dayKey(new Date(h.gradedAt))
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const total = weeks * 7
  return Array.from({ length: total }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (total - 1 - i))
    const key = dayKey(d)
    return { key, count: counts.get(key) ?? 0 }
  })
}
