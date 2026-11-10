import { motion } from 'motion/react'
import { spring } from './primitives.tsx'

const STEPS = ['Brief', 'Study', 'Explain', 'Rated'] as const
export type RailStep = (typeof STEPS)[number]

/** Where you are in a session. Shown in the top bar only while a session is in progress. */
export default function StepRail({ current }: { current: RailStep }) {
  const at = STEPS.indexOf(current)
  return (
    <nav className="rail" aria-label="Session progress">
      <ol>
        {STEPS.map((s, i) => (
          <li key={s} data-state={i < at ? 'done' : i === at ? 'current' : 'todo'} aria-current={i === at ? 'step' : undefined}>
            {i === at && <motion.span layoutId="rail-current" className="rail-current" transition={spring} />}
            <span className="rail-label">{s}</span>
          </li>
        ))}
      </ol>
    </nav>
  )
}
