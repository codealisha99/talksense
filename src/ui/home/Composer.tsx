import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { api } from '../../api.ts'
import { DURATIONS, MAX_TOPIC_LENGTH } from '../../rubric.ts'
import { NICHES, type Niche } from '../../topics.ts'
import { Arrow, Banner, Button, easeOut, spring } from '../primitives.tsx'
import { useScramble } from '../useScramble.ts'

const EXAMPLES = [
  'How sourdough fermentation works',
  'Why the sky is blue',
  'How a CPU executes code',
  'Why minor chords sound sad',
  'How compound interest snowballs',
  'How vaccines train immunity',
  'Why chess players open with e4',
  'How TCP handshakes work',
]

export const TOPIC_INPUT_ID = 'topic'

/** Scrolls to the topic field and focuses it. Used by "start" links elsewhere on the page. */
export function focusComposer() {
  const input = document.getElementById(TOPIC_INPUT_ID)
  input?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  input?.focus({ preventScroll: true })
}

type Props = {
  hasKey: boolean
  busy: boolean
  label: string
  onStart: (topic: string, minutes: number) => void
  /** No key yet: the parent opens key setup and continues with this topic afterwards. */
  onNeedKey: (pending: { topic: string; minutes: number } | null) => void
}

export default function Composer({ hasKey, busy, label, onStart, onNeedKey }: Props) {
  const [topic, setTopic] = useState('')
  const [minutes, setMinutes] = useState<number>(20)
  const [example, setExample] = useState(0)
  const [niche, setNiche] = useState<Niche | null>(null)
  const [hook, setHook] = useState('')
  const [rolling, setRolling] = useState(false)
  const [rollError, setRollError] = useState('')
  const scramble = useScramble()
  const ready = topic.trim().length >= 2 && !busy && !rolling

  useEffect(() => {
    if (topic) return
    const t = setInterval(() => setExample((i) => (i + 1) % EXAMPLES.length), 2600)
    return () => clearInterval(t)
  }, [topic])

  function submit() {
    if (!ready) return
    if (!hasKey) return onNeedKey({ topic: topic.trim(), minutes })
    onStart(topic.trim(), minutes)
  }

  async function roll() {
    if (!hasKey) return onNeedKey(null)
    setRollError('')
    setHook('')
    setRolling(true)
    scramble.spin()
    try {
      const idea = await api.randomTopic(niche)
      await scramble.settle(idea.topic)
      setTopic(idea.topic)
      setHook(idea.hook)
    } catch (e) {
      scramble.cancel()
      setRollError(e instanceof Error ? e.message : 'Could not get a random topic.')
    } finally {
      setRolling(false)
    }
  }

  return (
    <div className="composer">
      <label htmlFor={TOPIC_INPUT_ID} className="kicker">{label}</label>
      <div className="topic-field">
        <input
          id={TOPIC_INPUT_ID}
          value={scramble.display ?? topic}
          readOnly={scramble.display !== null}
          aria-busy={rolling}
          aria-describedby={hook ? 'topic-hook' : undefined}
          maxLength={MAX_TOPIC_LENGTH}
          autoComplete="off"
          spellCheck
          onChange={(e) => { setTopic(e.target.value); setHook('') }}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <AnimatePresence mode="wait">
          {!topic && scramble.display === null && (
            <motion.span
              key={example}
              className="placeholder"
              aria-hidden
              initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
              transition={{ duration: 0.45, ease: easeOut }}
            >
              {EXAMPLES[example]}
            </motion.span>
          )}
        </AnimatePresence>
        {topic.length > MAX_TOPIC_LENGTH - 30 && <span className="counter">{topic.length}/{MAX_TOPIC_LENGTH}</span>}
      </div>
      <AnimatePresence>
        {hook && (
          <motion.p id="topic-hook" key={hook} className="hook" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: easeOut }}>
            {hook}
          </motion.p>
        )}
      </AnimatePresence>

      <div className="composer-actions">
        <div className="segmented" role="group" aria-label="Study time">
          {DURATIONS.map((m) => (
            <button key={m} aria-pressed={m === minutes} onClick={() => setMinutes(m)}>
              {m === minutes && <motion.span layoutId="duration-pill" className="pill" transition={spring} />}
              <span>{m} min</span>
            </button>
          ))}
        </div>
        <Button variant="signal" onClick={submit} disabled={!ready} aria-busy={busy}>
          {busy ? 'Writing your brief…' : hasKey ? 'Get my brief' : 'Add key & start'} {!busy && <Arrow />}
        </Button>
      </div>

      <div className="surprise">
        <span className="kicker">No idea?</span>
        <Button variant="ghost" className="roll" onClick={roll} disabled={rolling || busy}>
          <Die rolling={rolling} /> {rolling ? 'Rolling…' : topic && hook ? 'Roll again' : 'Surprise me'}
        </Button>
        <div className="chips" role="group" aria-label="Surprise me from (optional)">
          {[null, ...NICHES].map((n) => (
            <button key={n ?? 'any'} className="chip" aria-pressed={n === niche} onClick={() => setNiche(n)}>
              {n === niche && <motion.span layoutId="niche-pill" className="chip-pill" transition={spring} />}
              <span>{n ?? 'Anything'}</span>
            </button>
          ))}
        </div>
      </div>
      {rollError && <Banner message={rollError} />}
    </div>
  )
}

/** A die that tumbles while a random topic is being rolled. */
function Die({ rolling }: { rolling: boolean }) {
  return (
    <motion.svg
      width="18" height="18" viewBox="0 0 18 18" aria-hidden
      animate={rolling ? { rotate: [0, 90, 180, 270, 360] } : { rotate: 0 }}
      transition={rolling ? { duration: 0.6, repeat: Infinity, ease: 'linear' } : spring}
    >
      <rect x="1.5" y="1.5" width="15" height="15" rx="3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      {[[5.5, 5.5], [12.5, 5.5], [9, 9], [5.5, 12.5], [12.5, 12.5]].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.3" fill="currentColor" />
      ))}
    </motion.svg>
  )
}
