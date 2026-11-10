import { animate, motion, useAnimationFrame, useMotionValue, useTransform } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Arrow, Button, Screen, mmss } from './primitives.tsx'

// A mechanical "time timer": the orange disc is the time you have left and shrinks back to 12 o'clock.
const C = 200
const WEDGE_R = 122
const TICK_OUTER = 172
const LABEL_R = 146

export const polar = (r: number, turn: number) => {
  const a = -turn * 2 * Math.PI // counter-clockwise from 12 o'clock, like the real thing
  return [C + r * Math.sin(a), C - r * Math.cos(a)] as const
}

export function wedgePath(f: number) {
  if (f <= 0.0005) return ''
  if (f >= 0.9995) return `M ${C} ${C - WEDGE_R} A ${WEDGE_R} ${WEDGE_R} 0 1 0 ${C} ${C + WEDGE_R} A ${WEDGE_R} ${WEDGE_R} 0 1 0 ${C} ${C - WEDGE_R} Z`
  const [x, y] = polar(WEDGE_R, f)
  return `M ${C} ${C} L ${C} ${C - WEDGE_R} A ${WEDGE_R} ${WEDGE_R} 0 ${f > 0.5 ? 1 : 0} 0 ${x} ${y} Z`
}

function chime() {
  try {
    const ctx = new AudioContext()
    ;[0, 0.22, 0.44].forEach((t, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = i === 2 ? 1318.5 : 987.8
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + t)
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + t + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.5)
      osc.connect(gain).connect(ctx.destination)
      osc.start(ctx.currentTime + t)
      osc.stop(ctx.currentTime + t + 0.55)
    })
    setTimeout(() => ctx.close(), 1500)
  } catch {
    // Audio is a nicety; the title change and screen change still signal the end.
  }
}

type Props = { topic: string; minutes: number; startedAt: number; objectives: string[]; onDone: () => void }

export default function Study({ topic, minutes, startedAt, objectives, onDone }: Props) {
  const total = minutes * 60_000
  const endAt = startedAt + total
  const remainingFraction = () => Math.max(0, endAt - Date.now()) / total

  const f = useMotionValue(0)
  const wound = useRef(false)
  const done = useRef(false)
  const [left, setLeft] = useState(() => endAt - Date.now())

  useEffect(() => {
    const controls = animate(f, remainingFraction(), { duration: 1.3, ease: [0.65, 0, 0.35, 1], onComplete: () => { wound.current = true } })
    return () => controls.stop()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useAnimationFrame(() => {
    if (wound.current) f.set(remainingFraction())
  })

  useEffect(() => {
    const t = setInterval(() => {
      const ms = endAt - Date.now()
      setLeft(ms)
      document.title = `${mmss(ms)} · ${topic}`
      if (ms <= 0 && !done.current) {
        done.current = true
        chime()
        onDone()
      }
    }, 250)
    return () => clearInterval(t)
  }, [endAt, topic, onDone])

  const d = useTransform(f, wedgePath)
  const knob = useTransform(f, (v) => -v * 360)
  const tickCount = minutes * 2

  return (
    <Screen className="center">
      <p className="kicker">Studying</p>
      <h1 className="title" style={{ fontSize: 'clamp(26px, 4vw, 34px)', marginTop: 8, maxWidth: '22ch' }}>{topic}</h1>

      <div className="dial-wrap">
        <svg viewBox="0 0 400 400" role="img" aria-label={`${mmss(left)} remaining`}>
          <defs>
            <radialGradient id="knob" cx="40%" cy="35%" r="70%">
              <stop offset="0%" stopColor="var(--card)" />
              <stop offset="100%" stopColor="var(--paper-2)" />
            </radialGradient>
            <filter id="lift" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="6" stdDeviation="8" floodOpacity="0.14" />
            </filter>
          </defs>

          <circle cx={C} cy={C} r={196} fill="var(--card)" stroke="var(--line)" filter="url(#lift)" />
          <circle cx={C} cy={C} r={182} fill="var(--paper)" stroke="var(--line)" />

          {Array.from({ length: tickCount }, (_, i) => {
            const major = i % 10 === 0
            const [x1, y1] = polar(TICK_OUTER, i / tickCount)
            const [x2, y2] = polar(TICK_OUTER - (major ? 16 : i % 2 === 0 ? 9 : 5), i / tickCount)
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={major ? 'var(--ink)' : 'var(--muted)'} strokeWidth={major ? 2 : 1} strokeLinecap="round" />
          })}

          {Array.from({ length: minutes / 5 }, (_, i) => {
            const [x, y] = polar(LABEL_R, (i * 5) / minutes)
            return (
              <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="central" fill="var(--ink-2)" style={{ font: '500 13px var(--mono)' }}>
                {i * 5}
              </text>
            )
          })}

          <motion.path d={d} fill="var(--signal)" />
          <motion.g style={{ rotate: knob }}>
            <circle cx={C} cy={C} r={34} fill="url(#knob)" stroke="var(--line)" filter="url(#lift)" />
            {Array.from({ length: 16 }, (_, i) => {
              const [x1, y1] = polar(30, i / 16)
              const [x2, y2] = polar(26, i / 16)
              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--line)" strokeWidth={1.5} />
            })}
            <line x1={C} y1={C - 6} x2={C} y2={C - 24} stroke="var(--ink)" strokeWidth={3} strokeLinecap="round" />
          </motion.g>
        </svg>
      </div>

      <div className="readout" role="timer" aria-live="off" style={{ marginTop: 20 }}>
        {mmss(left)}<small>LEFT</small>
      </div>

      <p className="lede" style={{ marginTop: 12 }}>Go learn anywhere. We'll chime when it's your turn to talk.</p>
      <div className="row" style={{ justifyContent: 'center', marginTop: 8 }}>
        <Button variant="ghost" onClick={() => { done.current = true; onDone() }}>I'm ready early <Arrow /></Button>
      </div>

      <details className="transcript" style={{ marginTop: 36, textAlign: 'left', width: '100%', maxWidth: 520 }}>
        <summary>What you'll explain</summary>
        <ol className="objectives" style={{ marginTop: 16 }}>
          {objectives.map((o, i) => (
            <li key={o}><span className="n">{String(i + 1).padStart(2, '0')}</span><span>{o}</span></li>
          ))}
        </ol>
      </details>
    </Screen>
  )
}
