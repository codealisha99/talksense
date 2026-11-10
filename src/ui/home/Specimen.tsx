import { motion } from 'motion/react'
import { StatusMark } from '../Result.tsx'

// What you walk away with: a marked exam sheet. An example, labelled as one; uses the real result components.
const MARKS = [
  { status: 'covered', objective: 'Explain what “seasoning” is made of', evidence: 'oil that has polymerised' },
  { status: 'partial', objective: 'Describe why heat hardens the oil', evidence: 'it gets hot and goes hard' },
  { status: 'missed', objective: 'Compare it with a non-stick coating', evidence: '' },
] as const

export default function Specimen() {
  return (
    <motion.aside
      className="specimen"
      aria-label="Example result"
      initial={{ opacity: 0, y: 24, rotate: 4 }}
      animate={{ opacity: 1, y: 0, rotate: 1.2 }}
      transition={{ delay: 0.35, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      <p className="kicker">Example result</p>
      <p className="specimen-topic">Why a cast-iron pan gets non-stick with use</p>
      <div className="score-hero">
        <span className="score-num">68</span>
        <span className="score-of">/100</span>
        <motion.span className="stamp" initial={{ opacity: 0, scale: 2.2, rotate: -16 }} animate={{ opacity: 1, scale: 1, rotate: -5 }} transition={{ delay: 1.1, type: 'spring', stiffness: 520, damping: 22 }}>
          Practitioner
        </motion.span>
      </div>
      <ul className="checks">
        {MARKS.map((m, i) => (
          <motion.li key={m.objective} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.4 + i * 0.15 }}>
            <StatusMark status={m.status} />
            <div>
              {m.objective}
              {m.evidence && <q><mark>{m.evidence}</mark></q>}
            </div>
          </motion.li>
        ))}
      </ul>
    </motion.aside>
  )
}
