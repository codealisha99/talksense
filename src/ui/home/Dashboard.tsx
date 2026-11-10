import { motion } from 'motion/react'
import { DIMENSIONS, type HistoryItem } from '../../rubric.ts'
import { activityDays, dayKey, dimensionAverages, scoreTrend, statsFor, weakestDimension } from '../../progress.ts'
import Composer, { focusComposer } from './Composer.tsx'
import { ActivityCalendar, ScoreTrend, SkillProfile } from './Insights.tsx'
import { parseAnchors } from './RubricExplorer.tsx'
import { Arrow, Button, Screen, easeOut, item, list } from '../primitives.tsx'

const CALENDAR_WEEKS = 12
const TREND_SESSIONS = 12

type Props = {
  history: HistoryItem[]
  hasKey: boolean
  busy: boolean
  onStart: (topic: string, minutes: number) => void
  onNeedKey: (pending: { topic: string; minutes: number } | null) => void
}

// Returning-user home: start the next session, then see what to work on, built only from real history.
export default function Dashboard({ history, ...composer }: Props) {
  const stats = statsFor(history)
  const averages = dimensionAverages(history)!
  const focusId = weakestDimension(averages)
  const focus = DIMENSIONS.find((d) => d.id === focusId)!
  const target = parseAnchors(focus.anchors).find((a) => a.mark === '4')?.text
  const doneToday = history.some((h) => dayKey(new Date(h.gradedAt)) === dayKey(new Date()))

  return (
    <Screen className="dashboard">
      <motion.div className="dash-head" variants={list} initial="hidden" animate="show">
        <motion.p className="kicker" variants={item}>
          {doneToday ? `Done for today · ${stats.streak}-day streak` : stats.streak > 0 ? `One session keeps your ${stats.streak}-day streak` : 'Welcome back'}
        </motion.p>
        <motion.h1 className="display medium" variants={item}>What will you explain today?</motion.h1>
        <motion.div variants={item}><Composer {...composer} label="Topic" /></motion.div>
      </motion.div>

      <div className="dash-grid">
        <motion.section className="panel focus-panel" aria-labelledby="focus-title" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.5, ease: easeOut }}>
          <p className="kicker">Focus next</p>
          <h2 id="focus-title" className="title focus-title">{focus.label}</h2>
          <p className="focus-meta mono">Your average {averages[focusId].toFixed(1)} / 4 · weighs {Math.round(focus.weight * 100)}% of every score</p>
          {target && <p className="focus-target"><span className="kicker">A 4 looks like</span>{target}</p>}
          <Button variant="ghost" onClick={focusComposer}>Practise on a new topic <Arrow /></Button>
        </motion.section>

        <motion.section className="panel" aria-labelledby="skills-title" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32, duration: 0.5, ease: easeOut }}>
          <h2 id="skills-title" className="kicker">Skill profile · {stats.sessions} session{stats.sessions === 1 ? '' : 's'}</h2>
          <SkillProfile averages={averages} focus={focusId} />
        </motion.section>

        <motion.section className="panel" aria-labelledby="consistency-title" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.39, duration: 0.5, ease: easeOut }}>
          <h2 id="consistency-title" className="kicker">Consistency · {stats.streak}-day streak</h2>
          <ActivityCalendar days={activityDays(history, CALENDAR_WEEKS)} />
        </motion.section>

        <motion.section className="panel" aria-labelledby="trend-title" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.46, duration: 0.5, ease: easeOut }}>
          <h2 id="trend-title" className="kicker">Trend · best {stats.best}</h2>
          <ScoreTrend scores={scoreTrend(history, TREND_SESSIONS)} average={stats.average} />
        </motion.section>
      </div>

      <section aria-labelledby="history-title" className="history-section">
        <h2 id="history-title" className="kicker">History</h2>
        <table className="history-table">
          <thead>
            <tr><th scope="col">Topic</th><th scope="col">Date</th><th scope="col">Level</th><th scope="col" className="num">Score</th></tr>
          </thead>
          <tbody>
            {history.map((h, i) => (
              <motion.tr key={h.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + Math.min(i, 12) * 0.04 }}>
                <td className="h-topic-cell"><a href={`/r/${h.id}`}>{h.topic}</a></td>
                <td className="mono muted">{new Date(h.gradedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</td>
                <td>{h.level}</td>
                <td className="num">
                  <span className="score-cell">
                    <span className="h-bar" aria-hidden><motion.span initial={{ width: 0 }} animate={{ width: `${h.score}%` }} transition={{ delay: 0.4 + Math.min(i, 12) * 0.04, duration: 0.7, ease: easeOut }} /></span>
                    <span className="mono">{h.score}</span>
                  </span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </section>
    </Screen>
  )
}
