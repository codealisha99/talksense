import { animate, motion, useMotionValue, useTransform } from 'motion/react'
import { useEffect, useState } from 'react'
import { DIMENSIONS, shareText, type ObjectiveStatus, type PublicResult } from '../rubric.ts'
import { Check } from './Processing.tsx'
import { Arrow, Button, Screen, easeOut } from './primitives.tsx'

// Choreography (seconds): number counts up, the level stamp lands, then the breakdown deals in.
const T_COUNT = 0.25
const COUNT_DURATION = 1.6
const T_STAMP = T_COUNT + COUNT_DURATION + 0.05
const T_DETAIL = T_STAMP + 0.35

type Props = { result: PublicResult; transcript?: string; isOwner: boolean; onNewTopic: () => void }

export default function Result({ result, transcript, isOwner, onNewTopic }: Props) {
  const { grade, score } = result
  const count = useMotionValue(0)
  const shown = useTransform(count, (v) => Math.round(v))
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const controls = animate(count, score, { delay: T_COUNT, duration: COUNT_DURATION, ease: [0.16, 1, 0.3, 1] })
    return () => controls.stop()
  }, [count, score])

  const url = `${location.origin}/r/${result.id}`
  const text = shareText(result.topic, score, result.studiedMinutes ?? result.minutes)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      window.prompt('Copy this link', url)
    }
  }

  return (
    <Screen>
      <motion.div
        className="stack"
        style={{ gap: 36 }}
        animate={{ y: [0, 0, 5, -2, 0] }}
        transition={{ delay: T_STAMP, duration: 0.35, times: [0, 0.01, 0.3, 0.6, 1] }}
      >
        <div className="stack" style={{ gap: 12 }}>
          <p className="kicker">
            {isOwner ? 'Your understanding' : 'Understanding score'} · {result.studiedMinutes ?? result.minutes} min study
          </p>
          <h1 className="title">{result.topic}</h1>
        </div>

        <div className="score-hero">
          <motion.span className="score-num" aria-label={`${score} out of 100`}>{shown}</motion.span>
          <span className="score-of">/100</span>
          <motion.span
            className="stamp"
            initial={{ opacity: 0, scale: 2.4, rotate: -14 }}
            animate={{ opacity: 1, scale: 1, rotate: -5 }}
            transition={{ delay: T_STAMP, type: 'spring', stiffness: 520, damping: 22, mass: 0.9 }}
          >
            {result.level}
          </motion.span>
        </div>

        <Reveal delay={T_DETAIL}>
          <p className="heard" style={{ color: 'var(--ink)', margin: 0 }}>{grade.summary}</p>
        </Reveal>

        <Reveal delay={T_DETAIL + 0.1}>
          <p className="kicker">Rubric</p>
          <div className="rubric">
            {DIMENSIONS.map((d, row) => {
              const { score: s, reason } = grade.dimensions[d.id]
              return (
                <div className="rubric-row" key={d.id}>
                  <h4>{d.label}<small>{Math.round(d.weight * 100)}% WEIGHT · {s}/4</small></h4>
                  <div className="cells" aria-label={`${s} of 4`}>
                    {[0, 1, 2, 3].map((cell) => (
                      <div className="cell" key={cell}>
                        {cell < s && (
                          <motion.div
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{ delay: T_DETAIL + 0.25 + row * 0.12 + cell * 0.07, duration: 0.35, ease: easeOut }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <p>{reason}</p>
                </div>
              )
            })}
          </div>
        </Reveal>

        <Reveal delay={T_DETAIL + 0.3}>
          <p className="kicker">Objectives</p>
          <ul className="checks">
            {grade.objectives.map((o) => (
              <li key={o.objective}>
                <StatusMark status={o.status} />
                <div>
                  {o.objective}
                  {o.evidence && <q><mark>{o.evidence}</mark></q>}
                </div>
              </li>
            ))}
          </ul>
        </Reveal>

        {grade.misconceptions.length > 0 && (
          <Reveal delay={T_DETAIL + 0.4}>
            <p className="kicker" style={{ color: 'var(--bad)' }}>Things to correct</p>
            <ul className="notes">{grade.misconceptions.map((m) => <li key={m}>{m}</li>)}</ul>
          </Reveal>
        )}

        <Reveal delay={T_DETAIL + 0.45}>
          <p className="kicker">Next steps</p>
          <ul className="notes">{grade.nextSteps.map((s) => <li key={s}>{s}</li>)}</ul>
        </Reveal>

        {transcript && (
          <details className="transcript">
            <summary>What we heard</summary>
            <p>{transcript}</p>
          </details>
        )}

        <motion.div
          className="share-bar"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: T_STAMP + 0.2, type: 'spring', stiffness: 300, damping: 28 }}
        >
          {isOwner ? (
            <>
              <a className="btn" target="_blank" rel="noreferrer" href={`https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`}>Post on X</a>
              <a className="btn ghost" target="_blank" rel="noreferrer" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}>LinkedIn</a>
              <Button variant="ghost" onClick={copy} aria-live="polite">{copied ? 'Copied ✓' : 'Copy link'}</Button>
              <Button variant="quiet" onClick={onNewTopic}>New topic</Button>
            </>
          ) : (
            <Button variant="signal" onClick={onNewTopic}>Try your own topic <Arrow /></Button>
          )}
        </motion.div>
      </motion.div>
    </Screen>
  )
}

function Reveal({ delay, children }: { delay: number; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.5, ease: easeOut }}>
      {children}
    </motion.div>
  )
}

export function StatusMark({ status }: { status: ObjectiveStatus }) {
  if (status === 'covered') return <span aria-label="Covered"><Check /></span>
  if (status === 'partial') {
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" aria-label="Partly covered" role="img">
        <circle cx="9" cy="9" r="6.5" fill="none" stroke="var(--mid)" strokeWidth="1.8" />
        <path d="M9 2.5a6.5 6.5 0 0 1 0 13z" fill="var(--mid)" />
      </svg>
    )
  }
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-label="Missed" role="img">
      <path d="M4.5 4.5l9 9M13.5 4.5l-9 9" stroke="var(--bad)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
