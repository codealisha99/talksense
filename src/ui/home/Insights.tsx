import { motion } from 'motion/react'
import { DIMENSIONS, type DimensionId } from '../../rubric.ts'
import type { ActivityDay, DimensionScores } from '../../progress.ts'
import { easeOut } from '../primitives.tsx'

export function SkillProfile({ averages, focus }: { averages: DimensionScores; focus: DimensionId }) {
  return (
    <ul className="skills" aria-label="Average score per rubric part, out of 4">
      {DIMENSIONS.map((d, i) => (
        <li key={d.id} className={d.id === focus ? 'is-focus' : undefined}>
          <span className="skill-name">{d.label}<small>{Math.round(d.weight * 100)}%</small></span>
          <span className="skill-track" aria-hidden>
            {[1, 2, 3].map((t) => <i key={t} style={{ left: `${t * 25}%` }} />)}
            <motion.span className="skill-fill" initial={{ width: 0 }} animate={{ width: `${(averages[d.id] / 4) * 100}%` }} transition={{ delay: 0.2 + i * 0.08, duration: 0.8, ease: easeOut }} />
          </span>
          <span className="skill-value">{averages[d.id].toFixed(1)}</span>
        </li>
      ))}
    </ul>
  )
}

const fmtDay = (key: string) => new Date(`${key}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })

/** Weeks as columns, days as rows, like a paper wall calendar turned sideways. */
export function ActivityCalendar({ days }: { days: ActivityDay[] }) {
  const active = days.filter((d) => d.count > 0).length
  return (
    <figure className="calendar">
      <div className="calendar-grid" role="img" aria-label={`${active} active days in the last ${days.length / 7} weeks`}>
        {days.map((d, i) => (
          <motion.span
            key={d.key}
            className="day"
            data-level={Math.min(d.count, 3)}
            title={`${fmtDay(d.key)}: ${d.count ? `${d.count} session${d.count > 1 ? 's' : ''}` : 'no sessions'}`}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 + i * 0.006, duration: 0.25 }}
          />
        ))}
      </div>
      <figcaption className="fine">{active} active day{active === 1 ? '' : 's'} in {days.length / 7} weeks</figcaption>
    </figure>
  )
}

/** Recent scores as a line, with the average as a dashed reference. */
export function ScoreTrend({ scores, average }: { scores: number[]; average: number }) {
  const W = 280
  const H = 72
  const x = (i: number) => (scores.length === 1 ? W / 2 : (i / (scores.length - 1)) * W)
  const y = (s: number) => H - 4 - (s / 100) * (H - 8)
  const path = scores.map((s, i) => `${i ? 'L' : 'M'} ${x(i).toFixed(1)} ${y(s).toFixed(1)}`).join(' ')
  const last = scores.at(-1) ?? 0
  const delta = last - average
  return (
    <figure className="trend">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Last ${scores.length} scores, most recent ${last}; average ${average}`}>
        <line x1="0" x2={W} y1={y(average)} y2={y(average)} className="trend-avg" />
        <motion.path d={path} className="trend-line" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, ease: easeOut, delay: 0.2 }} />
        {scores.map((s, i) => <circle key={i} cx={x(i)} cy={y(s)} r={i === scores.length - 1 ? 4 : 2.5} className={i === scores.length - 1 ? 'trend-last' : 'trend-dot'} />)}
      </svg>
      <figcaption className="fine">
        Latest <b className="mono">{last}</b>, {delta === 0 ? 'right on' : `${Math.abs(delta)} ${delta > 0 ? 'above' : 'below'}`} your average of <b className="mono">{average}</b>
      </figcaption>
    </figure>
  )
}
