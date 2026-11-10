import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { DIMENSIONS } from '../../rubric.ts'
import { polar, wedgePath } from '../Study.tsx'
import { easeOut } from '../primitives.tsx'

// An example session told with the app's real visual elements. Labelled as an example; no claims, no stats.
const EXAMPLE = {
  topic: 'Why a cast-iron pan gets non-stick with use',
  objectives: [
    'Explain what “seasoning” is made of',
    'Describe why heat turns oil into a hard layer',
    'Compare a seasoned pan with a non-stick coating',
  ],
  heard: 'Seasoning is oil that has polymerised. When you heat a thin layer past its smoke point it cross-links into a hard, slick film',
  scores: { coverage: 3, accuracy: 4, depth: 3, clarity: 3 } as Record<string, number>,
  score: 82,
  level: 'Expert',
}

const STEPS = [
  { id: 'brief', title: 'Pick a topic, get a brief', body: 'Type anything or roll a random idea. You get 3–5 concrete things you should be able to explain.' },
  { id: 'study', title: 'Study anywhere', body: 'Read, watch, listen, wherever you like. A 15, 20 or 30 minute timer runs here.' },
  { id: 'explain', title: 'Explain it out loud', body: 'Teach it back in your own words. Your voice is transcribed, or you can type.' },
  { id: 'rated', title: 'Get rated, honestly', body: 'Graded on the same four-part rubric every time, with quotes from what you actually said.' },
] as const
type StepId = (typeof STEPS)[number]['id']

const STEP_MS = 4200

export default function LoopDemo() {
  const reduce = useReducedMotion()
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    if (reduce || paused) return
    const t = setTimeout(() => setActive((i) => (i + 1) % STEPS.length), STEP_MS)
    return () => clearTimeout(t)
  }, [active, paused, reduce])

  // Arrow keys move between steps, as in any tab list.
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const next = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? i - 1 : null
    if (next === null) return
    e.preventDefault()
    const n = (next + STEPS.length) % STEPS.length
    setActive(n)
    tabs.current[n]?.focus()
  }

  return (
    <div className="loop" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div className="loop-steps" role="tablist" aria-label="How a session works" aria-orientation="vertical">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            ref={(el) => { tabs.current[i] = el }}
            role="tab"
            id={`loop-tab-${s.id}`}
            aria-selected={i === active}
            aria-controls="loop-panel"
            tabIndex={i === active ? 0 : -1}
            className="loop-step"
            onClick={() => setActive(i)}
            onKeyDown={(e) => onKey(e, i)}
          >
            <span className="loop-n">{String(i + 1).padStart(2, '0')}</span>
            <span>
              <span className="loop-title">{s.title}</span>
              <span className="loop-body">{s.body}</span>
            </span>
            {i === active && !reduce && !paused && (
              <motion.span className="loop-progress" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: STEP_MS / 1000, ease: 'linear' }} />
            )}
          </button>
        ))}
      </div>

      <div className="loop-stage" id="loop-panel" role="tabpanel" aria-labelledby={`loop-tab-${STEPS[active].id}`}>
        <p className="kicker loop-label">Example session · {EXAMPLE.topic}</p>
        <AnimatePresence mode="wait">
          <motion.div
            key={STEPS[active].id}
            className="loop-scene"
            initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, filter: 'blur(4px)', transition: { duration: 0.18 } }}
            transition={{ duration: 0.45, ease: easeOut }}
          >
            <Scene id={STEPS[active].id} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

function Scene({ id }: { id: StepId }) {
  if (id === 'brief') return <BriefScene />
  if (id === 'study') return <DialScene />
  if (id === 'explain') return <VoiceScene />
  return <RatedScene />
}

function BriefScene() {
  return (
    <div className="ticket mini">
      <p className="kicker" style={{ marginTop: 0 }}>By the end you should be able to</p>
      <ol className="objectives">
        {EXAMPLE.objectives.map((o, i) => (
          <motion.li key={o} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.12, ease: easeOut }}>
            <span className="n">{String(i + 1).padStart(2, '0')}</span><span>{o}</span>
          </motion.li>
        ))}
      </ol>
    </div>
  )
}

function DialScene() {
  const f = useMotionValue(1)
  const d = useTransform(f, wedgePath)
  useEffect(() => {
    const c = animate(f, 0.35, { duration: 3.2, ease: [0.45, 0, 0.55, 1] })
    return () => c.stop()
  }, [f])
  return (
    <svg viewBox="0 0 400 400" className="mini-dial" aria-hidden>
      <circle cx="200" cy="200" r="190" fill="var(--card)" stroke="var(--line)" />
      {Array.from({ length: 40 }, (_, i) => {
        const [x1, y1] = polar(172, i / 40)
        const [x2, y2] = polar(i % 10 === 0 ? 154 : 164, i / 40)
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={i % 10 === 0 ? 'var(--ink)' : 'var(--muted)'} strokeWidth={i % 10 === 0 ? 2 : 1} />
      })}
      <motion.path d={d} fill="var(--signal)" />
      <circle cx="200" cy="200" r="30" fill="var(--card)" stroke="var(--line)" />
    </svg>
  )
}

function VoiceScene() {
  const words = EXAMPLE.heard.split(' ')
  return (
    <div className="voice-scene">
      <div className="bars" aria-hidden>
        {Array.from({ length: 36 }, (_, i) => (
          <motion.span
            key={i}
            animate={{ scaleY: [0.15, 0.25 + ((i * 37) % 70) / 100, 0.2, 0.15 + ((i * 53) % 80) / 100, 0.15] }}
            transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.03, ease: 'easeInOut' }}
          />
        ))}
      </div>
      <p className="heard">
        {words.map((w, i) => (
          <motion.span key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 + i * 0.09 }}>{w} </motion.span>
        ))}
      </p>
    </div>
  )
}

function RatedScene() {
  const n = useMotionValue(0)
  const shown = useTransform(n, (v) => Math.round(v))
  useEffect(() => {
    const c = animate(n, EXAMPLE.score, { duration: 1.2, ease: [0.16, 1, 0.3, 1] })
    return () => c.stop()
  }, [n])
  return (
    <div className="rated-scene">
      <div className="score-hero">
        <motion.span className="score-num small">{shown}</motion.span>
        <span className="score-of">/100</span>
        <motion.span className="stamp" initial={{ opacity: 0, scale: 2, rotate: -14 }} animate={{ opacity: 1, scale: 1, rotate: -5 }} transition={{ delay: 1.2, type: 'spring', stiffness: 520, damping: 22 }}>
          {EXAMPLE.level}
        </motion.span>
      </div>
      <div className="mini-rubric">
        {DIMENSIONS.map((d, row) => (
          <div key={d.id} className="mini-rubric-row">
            <span className="kicker">{d.label}</span>
            <div className="cells">
              {[0, 1, 2, 3].map((c) => (
                <div className="cell" key={c}>
                  {c < EXAMPLE.scores[d.id] && <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.3 + row * 0.1 + c * 0.05 }} />}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
