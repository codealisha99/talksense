import { motion } from 'motion/react'
import type { Brief } from '../rubric.ts'
import { Arrow, Button, Screen, easeOut, item, list } from './primitives.tsx'

type Props = { topic: string; minutes: number; brief: Brief; busy: boolean; onStart: () => void; onBack: () => void }

export default function BriefScreen({ topic, minutes, brief, busy, onStart, onBack }: Props) {
  return (
    <Screen>
      <div className="stack" style={{ gap: 24 }}>
        <div className="stack" style={{ gap: 10 }}>
          <p className="kicker">Your brief · {minutes} minutes</p>
          <h1 className="title">{topic}</h1>
          <p className="lede">
            Read, watch or listen to anything you like. When the timer ends, you'll explain this out loud
            and we'll check you can do the following.
          </p>
        </div>

        <motion.div
          className="ticket"
          initial={{ opacity: 0, y: 24, rotate: -1.2 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ duration: 0.7, ease: easeOut }}
        >
          <p className="kicker" style={{ marginTop: 0 }}>By the end you should be able to</p>
          <motion.ol className="objectives" variants={list} initial="hidden" animate="show">
            {brief.objectives.map((o, i) => (
              <motion.li key={o} variants={item}>
                <span className="n">{String(i + 1).padStart(2, '0')}</span>
                <span>{o}</span>
              </motion.li>
            ))}
          </motion.ol>

          <div className="ticket-cut" aria-hidden />

          <p className="kicker" style={{ marginTop: 0 }}>Key terms</p>
          <div className="tags">
            {brief.keyTerms.map((t, i) => (
              <motion.span key={t} className="tag" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 + i * 0.04 }}>
                {t}
              </motion.span>
            ))}
          </div>

          <p className="kicker" style={{ marginTop: 24 }}>Good places to start</p>
          <ul className="resources">
            {brief.searchQueries.map((q) => (
              <li key={q}>
                <span>{q}</span>
                <span className="links">
                  <a href={`https://www.google.com/search?q=${encodeURIComponent(q)}`} target="_blank" rel="noreferrer">Web</a>
                  <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`} target="_blank" rel="noreferrer">Video</a>
                </span>
              </li>
            ))}
          </ul>
        </motion.div>

        <div className="row" style={{ justifyContent: 'space-between' }}>
          <Button variant="quiet" onClick={onBack}>← Change topic</Button>
          <Button variant="signal" onClick={onStart} disabled={busy}>
            Start the {minutes}-minute timer <Arrow />
          </Button>
        </div>
      </div>
    </Screen>
  )
}
