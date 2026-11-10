import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { MIN_ANSWER_WORDS, wordCount } from '../rubric.ts'
import { Arrow, Banner, Button, Screen, item, list, mmss, spring } from './primitives.tsx'

const MAX_RECORD_MS = 10 * 60 * 1000 // keeps uploads well under OpenAI's 25 MB limit

type Props = {
  topic: string
  objectives: string[]
  error: string
  /** Text the learner typed before a failed submit, restored so it isn't lost. */
  draft?: string
  /** True when the server already holds this answer and only the rating needs retrying. */
  saved?: boolean
  onRetry?: () => void
  onAudio: (audio: Blob) => void
  onText: (text: string) => void
}

export default function Answer({ topic, objectives, error, draft, saved, onRetry, onAudio, onText }: Props) {
  const [mode, setMode] = useState<'voice' | 'text'>(draft ? 'text' : 'voice')
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [micError, setMicError] = useState('')
  const [typed, setTyped] = useState(draft ?? '')

  const recorder = useRef<MediaRecorder | null>(null)
  const canvas = useRef<HTMLCanvasElement | null>(null)
  const teardown = useRef<() => void>(() => {})
  const starting = useRef(false) // blocks a second start while the mic permission prompt is open
  const level = useMotionValue(0)
  const smooth = useSpring(level, { stiffness: 300, damping: 20 })
  const haloScale = useTransform(smooth, [0, 1], [1, 1.32])

  useEffect(() => () => teardown.current(), [])

  async function start() {
    if (starting.current) return
    starting.current = true
    setMicError('')
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
    } catch {
      setMicError('Microphone is blocked or unavailable. Allow access in your browser, or type your explanation instead.')
      return
    } finally {
      starting.current = false
    }

    const audioCtx = new AudioContext()
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 2048
    audioCtx.createMediaStreamSource(stream).connect(analyser)
    const samples = new Float32Array(analyser.fftSize)
    const ink = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#161513'
    const startedAt = Date.now()
    let frame = 0
    let lastMs = 0

    const draw = () => {
      analyser.getFloatTimeDomainData(samples)
      let sum = 0
      for (const s of samples) sum += s * s
      level.set(Math.min(1, Math.sqrt(sum / samples.length) * 6))

      const el = canvas.current
      const ctx = el?.getContext('2d')
      if (el && ctx) {
        const dpr = window.devicePixelRatio || 1
        const w = el.clientWidth
        const h = el.clientHeight
        if (el.width !== w * dpr) { el.width = w * dpr; el.height = h * dpr }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.clearRect(0, 0, w, h)
        ctx.lineWidth = 1.5
        ctx.strokeStyle = ink
        ctx.beginPath()
        const step = samples.length / w
        for (let x = 0; x < w; x++) {
          const y = h / 2 + samples[Math.floor(x * step)] * h * 1.4
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
      const ms = Date.now() - startedAt
      if (Math.floor(ms / 1000) !== Math.floor(lastMs / 1000)) setElapsed(ms) // re-render once a second, not every frame
      lastMs = ms
      if (ms >= MAX_RECORD_MS) rec.state === 'recording' && rec.stop()
      frame = requestAnimationFrame(draw)
    }

    const rec = new MediaRecorder(stream)
    const chunks: Blob[] = []
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
    rec.onstop = () => {
      teardown.current()
      setRecording(false)
      onAudio(new Blob(chunks, { type: rec.mimeType }))
    }
    teardown.current = () => {
      cancelAnimationFrame(frame)
      stream.getTracks().forEach((t) => t.stop())
      if (audioCtx.state !== 'closed') audioCtx.close()
      level.set(0)
    }

    rec.start(1000)
    recorder.current = rec
    setElapsed(0)
    setRecording(true)
    frame = requestAnimationFrame(draw)
  }

  const stop = () => recorder.current?.state === 'recording' && recorder.current.stop()
  const words = wordCount(typed)

  return (
    <Screen>
      <div className="stack" style={{ gap: 24 }}>
        <div className="stack" style={{ gap: 10 }}>
          <p className="kicker">Your turn</p>
          <h1 className="title">Explain “{topic}”</h1>
          <p className="lede">Teach it like you would to a curious friend. Cover these:</p>
        </div>

        <motion.ol className="objectives" variants={list} initial="hidden" animate="show">
          {objectives.map((o, i) => (
            <motion.li key={o} variants={item}><span className="n">{String(i + 1).padStart(2, '0')}</span><span>{o}</span></motion.li>
          ))}
        </motion.ol>

        {(error || micError) && <Banner message={micError || error} />}
        {onRetry && !micError && (
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="fine">
              {saved ? 'Your explanation is saved. Only the rating needs to run again.' : 'Your recording is kept. You can send it again.'}
            </span>
            <Button variant="signal" onClick={onRetry}>{saved ? 'Retry rating' : 'Send again'} <Arrow /></Button>
          </div>
        )}

        <AnimatePresence mode="wait" initial={false}>
          {mode === 'voice' ? (
            <motion.div key="voice" className="panel stack center" style={{ padding: '36px 24px 24px', gap: 18 }}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <div className="rec">
                <div className="rec-ring" />
                <motion.div className="rec-halo" style={{ scale: haloScale, opacity: recording ? 1 : 0 }} />
                <motion.button
                  className="rec-btn"
                  onClick={recording ? stop : start}
                  aria-label={recording ? 'Stop recording and get rated' : 'Start recording'}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.94 }}
                  transition={spring}
                >
                  <motion.span
                    className="rec-core"
                    animate={recording ? { width: 30, height: 30, borderRadius: 7 } : { width: 58, height: 58, borderRadius: 29 }}
                    transition={spring}
                  />
                </motion.button>
              </div>

              <div style={{ width: '100%', maxWidth: 520, height: 72, opacity: recording ? 1 : 0.25, transition: 'opacity .3s' }}>
                {recording ? <canvas ref={canvas} className="wave" aria-hidden /> : <div style={{ height: 72, display: 'grid', placeItems: 'center' }}><div style={{ width: '100%', height: 1.5, background: 'var(--ink)' }} /></div>}
              </div>

              <div className="mono" style={{ fontSize: 15 }} aria-live="polite">
                {recording ? <>● REC {mmss(elapsed)}<span className="muted"> / 10:00</span></> : <span className="muted">TAP TO START TALKING</span>}
              </div>
              {recording && <Button variant="signal" onClick={stop}>Done, rate me <Arrow /></Button>}
              {!recording && <Button variant="quiet" onClick={() => setMode('text')}>Type instead</Button>}
            </motion.div>
          ) : (
            <motion.div key="text" className="stack" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <label htmlFor="typed" className="kicker">Your explanation</label>
              <textarea id="typed" className="answer" value={typed} autoFocus onChange={(e) => setTyped(e.target.value)} maxLength={20000} />
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <Button variant="quiet" onClick={() => setMode('voice')}>← Use the mic</Button>
                <div className="row">
                  <span className="mono muted" style={{ fontSize: 13 }}>{words} words{words < MIN_ANSWER_WORDS ? ` · ${MIN_ANSWER_WORDS} min` : ''}</span>
                  <Button variant="signal" disabled={words < MIN_ANSWER_WORDS} onClick={() => onText(typed)}>Rate me <Arrow /></Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Screen>
  )
}
