import { motion } from 'motion/react'
import { Screen, easeOut } from './primitives.tsx'

export type Step = 'transcribing' | 'grading'

const STEPS: { id: Step; label: string }[] = [
  { id: 'transcribing', label: 'Turning your voice into text' },
  { id: 'grading', label: 'Checking it against the rubric' },
]

type Props = { step: Step; transcript: string }

export default function Processing({ step, transcript }: Props) {
  const current = STEPS.findIndex((s) => s.id === step)
  const words = transcript.split(/\s+/).filter(Boolean)

  return (
    <Screen>
      <div className="stack" style={{ gap: 28 }}>
        <div className="stack" style={{ gap: 10 }}>
          <p className="kicker">One moment</p>
          <h1 className="title">Listening back to you…</h1>
        </div>

        <ol className="steps" aria-live="polite">
          {STEPS.map((s, i) => {
            const state = i < current ? 'done' : i === current ? 'active' : 'pending'
            return (
              <li key={s.id} data-state={state}>
                {state === 'done' && <Check />}
                {state === 'active' && <motion.div className="spinner" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />}
                {state === 'pending' && <span className="mono muted" style={{ fontSize: 12 }}>{String(i + 1).padStart(2, '0')}</span>}
                <span>{s.label}</span>
              </li>
            )
          })}
        </ol>

        {words.length > 0 && (
          <div className="stack" style={{ gap: 10 }}>
            <p className="kicker">What we heard</p>
            <p className="heard">
              {words.map((w, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, filter: 'blur(3px)' }}
                  animate={{ opacity: 1, filter: 'blur(0px)' }}
                  transition={{ delay: Math.min(i, 120) * 0.025, duration: 0.3, ease: easeOut }}
                >
                  {w}{' '}
                </motion.span>
              ))}
            </p>
          </div>
        )}
      </div>
    </Screen>
  )
}

export function Check({ color = 'var(--good)' }: { color?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <motion.path d="M3 9.5l4 4 8-9" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, ease: easeOut }} />
    </svg>
  )
}
