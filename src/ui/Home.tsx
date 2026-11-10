import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { DURATIONS, MAX_TOPIC_LENGTH, type HistoryItem } from '../rubric.ts'
import { statsFor } from '../progress.ts'
import { api } from '../api.ts'
import { NICHES, type Niche } from '../topics.ts'
import { Arrow, Banner, Button, Screen, easeOut, item, list, spring } from './primitives.tsx'
import { useScramble } from './useScramble.ts'

const EXAMPLES = [
  'How sourdough fermentation works',
  'Why the sky is blue',
  'How a CPU executes code',
  'Music chord progressions',
  'Compound interest',
  'How vaccines train immunity',
  'The rules of chess openings',
  'How TCP handshakes work',
]

type Props = {
  hasKey: boolean
  busy: boolean
  history: HistoryItem[]
  onStart: (topic: string, minutes: number) => void
  onOpenSettings: () => void
}

export default function Home({ hasKey, busy, history, onStart, onOpenSettings }: Props) {
  const [topic, setTopic] = useState('')
  const [minutes, setMinutes] = useState<number>(20)
  const [example, setExample] = useState(0)
  const [niche, setNiche] = useState<Niche | null>(null)
  const [hook, setHook] = useState('')
  const [rolling, setRolling] = useState(false)
  const [rollError, setRollError] = useState('')
  const scramble = useScramble()
  const stats = statsFor(history)
  const canStart = hasKey && topic.trim().length >= 2 && !busy && !rolling

  async function roll() {
    if (!hasKey) return onOpenSettings()
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

  useEffect(() => {
    if (topic) return
    const t = setInterval(() => setExample((i) => (i + 1) % EXAMPLES.length), 2600)
    return () => clearInterval(t)
  }, [topic])

  const submit = () => canStart && onStart(topic.trim(), minutes)

  return (
    <Screen>
      <motion.div className="stack" style={{ gap: 28 }} variants={list} initial="hidden" animate="show">
        <motion.p className="kicker" variants={item}>Study · Explain · Get rated</motion.p>
        <motion.h1 className="display" variants={item}>
          Learn anything in {minutes} minutes.<br />
          <em>Then say it out loud.</em>
        </motion.h1>

        <motion.div variants={item}>
          <label htmlFor="topic" className="kicker">Topic</label>
          <div className="topic-field">
            <input
              id="topic"
              value={scramble.display ?? topic}
              readOnly={scramble.display !== null}
              aria-busy={rolling}
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
              <motion.p key={hook} className="hook" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: easeOut }}>
                {hook}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div className="surprise" variants={item}>
          <Button variant="ghost" className="roll" onClick={roll} disabled={rolling || busy} aria-label="Give me a random topic">
            <Die rolling={rolling} /> {rolling ? 'Rolling…' : topic && hook ? 'Roll again' : 'Surprise me'}
          </Button>
          <div className="chips" role="group" aria-label="Random topic niche (optional)">
            {[null, ...NICHES].map((n) => (
              <button key={n ?? 'any'} className="chip" aria-pressed={n === niche} onClick={() => setNiche(n)}>
                {n === niche && <motion.span layoutId="niche-pill" className="chip-pill" transition={spring} />}
                <span>{n ?? 'Anything'}</span>
              </button>
            ))}
          </div>
        </motion.div>
        {rollError && <Banner message={rollError} />}

        <motion.div className="row" style={{ justifyContent: 'space-between', gap: 16 }} variants={item}>
          <div className="segmented" role="group" aria-label="Study time">
            {DURATIONS.map((m) => (
              <button key={m} aria-pressed={m === minutes} onClick={() => setMinutes(m)}>
                {m === minutes && <motion.span layoutId="duration-pill" className="pill" transition={spring} />}
                <span>{m} min</span>
              </button>
            ))}
          </div>
          <Button variant="signal" onClick={submit} disabled={!canStart}>
            {busy ? 'Writing your brief…' : 'Get my brief'} {!busy && <Arrow />}
          </Button>
        </motion.div>

        {!hasKey && (
          <motion.div className="panel keycard" variants={item}>
            <div>
              <p className="kicker" style={{ margin: 0 }}>One-time setup</p>
              <p style={{ margin: '6px 0 0' }}>Talksense runs on your own OpenAI key.</p>
            </div>
            <Button variant="ghost" onClick={onOpenSettings}>Add API key</Button>
          </motion.div>
        )}

        {history.length > 0 && (
          <motion.div className="stack" style={{ gap: 20, marginTop: 24 }} variants={item}>
            <div className="stats">
              <Stat label="Day streak" value={stats.streak} />
              <Stat label="Sessions" value={stats.sessions} />
              <Stat label="Average" value={stats.average} />
              <Stat label="Best" value={stats.best} />
            </div>
            <div>
              <p className="kicker">Recent</p>
              <ul className="history">
                {history.slice(0, 8).map((h, i) => (
                  <motion.li key={h.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.05 }}>
                    <a href={`/r/${h.id}`}>
                      <span className="h-topic">{h.topic}</span>
                      <span className="h-bar" aria-hidden>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${h.score}%` }} transition={{ delay: 0.4 + i * 0.05, duration: 0.8, ease: easeOut }} />
                      </span>
                      <span className="h-score">{h.score}</span>
                    </a>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </motion.div>
    </Screen>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat">
      <span className="kicker">{label}</span>
      <b className="mono-num">{value}</b>
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
