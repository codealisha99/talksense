import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'
import { api, getKey, setKey } from './api.ts'
import { statsFor } from './progress.ts'
import type { Brief, HistoryItem, PublicResult } from './rubric.ts'
import Answer from './ui/Answer.tsx'
import BriefScreen from './ui/BriefScreen.tsx'
import Home from './ui/Home.tsx'
import Processing, { type Step } from './ui/Processing.tsx'
import Result from './ui/Result.tsx'
import Settings from './ui/Settings.tsx'
import Study from './ui/Study.tsx'
import { Banner, Button, ProgressLine, Screen, spring } from './ui/primitives.tsx'

type Session = { id: string; topic: string; minutes: number; brief: Brief }
type Flow =
  | { stage: 'home' }
  | ({ stage: 'brief' } & Session)
  | ({ stage: 'study'; startedAt: number } & Session)
  | ({ stage: 'answer' } & Session)
  | ({ stage: 'processing'; step: Step; transcript: string } & Session)
  | { stage: 'result'; result: PublicResult; transcript: string }

const FLOW_STORAGE = 'talksense.flow'
const HOME: Flow = { stage: 'home' }

/** Restore an in-progress session after a reload; a request that was in flight resumes at the answer step. */
function loadFlow(): Flow {
  try {
    const saved = JSON.parse(localStorage.getItem(FLOW_STORAGE) ?? 'null') as Flow | null
    if (!saved) return HOME
    if (saved.stage === 'processing') return { stage: 'answer', id: saved.id, topic: saved.topic, minutes: saved.minutes, brief: saved.brief }
    return saved
  } catch {
    return HOME
  }
}

const shareId = (path: string) => /^\/r\/([0-9a-f-]{36})\/?$/i.exec(path)?.[1] ?? null

export default function App() {
  const [path, setPath] = useState(location.pathname)
  const [flow, setFlow] = useState<Flow>(loadFlow)
  const [key, setKeyState] = useState(getKey)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [pastSessions, setPastSessions] = useState<HistoryItem[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => localStorage.setItem(FLOW_STORAGE, JSON.stringify(flow)), [flow])
  useEffect(() => {
    const onPop = () => setPath(location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  useEffect(() => { if (flow.stage !== 'study') document.title = 'Talksense' }, [flow.stage])

  const refreshHistory = useCallback(() => {
    api.history().then(setPastSessions).catch(() => { /* history is non-critical; home still works without it */ })
  }, [])
  useEffect(refreshHistory, [refreshHistory])

  const go = (next: Flow) => { setError(''); setFlow(next); window.scrollTo({ top: 0 }) }
  const navigateHome = () => {
    const midSession = flow.stage === 'study' || flow.stage === 'answer'
    if (midSession && !window.confirm('Leave this session? Your timer and progress will be lost.')) return
    history.pushState(null, '', '/')
    setPath('/')
    go(HOME)
  }

  async function attempt(task: () => Promise<void>) {
    setError('')
    setBusy(true)
    try {
      await task()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const createSession = (topic: string, minutes: number) =>
    attempt(async () => {
      const { id, brief } = await api.createSession(topic, minutes)
      go({ stage: 'brief', id, topic, minutes, brief })
    })

  const startTimer = (s: Session) =>
    attempt(async () => {
      await api.start(s.id)
      go({ stage: 'study', ...session(s), startedAt: Date.now() })
    })

  async function submit(s: Session, getTranscript: () => Promise<{ transcript: string }>) {
    go({ stage: 'processing', ...session(s), step: 'transcribing', transcript: '' })
    try {
      const { transcript } = await getTranscript()
      setFlow({ stage: 'processing', ...session(s), step: 'grading', transcript })
      const result = await api.grade(s.id)
      go({ stage: 'result', result, transcript })
      refreshHistory()
    } catch (e) {
      setFlow({ stage: 'answer', ...session(s) })
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    }
  }

  const saveKey = (next: string) => { setKey(next); setKeyState(next); setSettingsOpen(false) }
  const streak = statsFor(pastSessions).streak
  const viewingShare = shareId(path)

  return (
    <div className="shell">
      {busy && <ProgressLine />}
      <header className="topbar">
        <button className="wordmark" onClick={navigateHome} aria-label="Talksense home">
          <motion.span className="dot" animate={{ scale: [1, 1.35, 1] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }} />
          talksense
        </button>
        <div className="topbar-right">
          <AnimatePresence>
            {streak > 0 && (
              <motion.span className="kicker" style={{ color: 'var(--signal)', marginRight: 8 }} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={spring}>
                {streak}-day streak
              </motion.span>
            )}
          </AnimatePresence>
          <Button variant="quiet" onClick={() => setSettingsOpen(true)}>
            <span style={{ width: 7, height: 7, borderRadius: 9, background: key ? 'var(--good)' : 'var(--bad)' }} aria-hidden />
            API key
          </Button>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {viewingShare ? (
          <SharedResult key={`share-${viewingShare}`} id={viewingShare} isOwner={pastSessions.some((h) => h.id === viewingShare)} onNewTopic={navigateHome} />
        ) : (
          <motion.div key={flow.stage} style={{ display: 'contents' }}>
            {error && flow.stage !== 'answer' && <div style={{ marginTop: 16 }}><Banner message={error} /></div>}
            {flow.stage === 'home' && (
              <Home hasKey={!!key} busy={busy} history={pastSessions} onStart={createSession} onOpenSettings={() => setSettingsOpen(true)} />
            )}
            {flow.stage === 'brief' && (
              <BriefScreen {...flow} busy={busy} onStart={() => startTimer(flow)} onBack={() => go(HOME)} />
            )}
            {flow.stage === 'study' && (
              <Study topic={flow.topic} minutes={flow.minutes} startedAt={flow.startedAt} objectives={flow.brief.objectives}
                onDone={() => go({ stage: 'answer', ...session(flow) })} />
            )}
            {flow.stage === 'answer' && (
              <Answer topic={flow.topic} objectives={flow.brief.objectives} error={error}
                onAudio={(audio) => submit(flow, () => api.transcribeAudio(flow.id, audio))}
                onText={(text) => submit(flow, () => api.submitText(flow.id, text))} />
            )}
            {flow.stage === 'processing' && <Processing step={flow.step} transcript={flow.transcript} />}
            {flow.stage === 'result' && (
              <Result result={flow.result} transcript={flow.transcript} isOwner onNewTopic={() => go(HOME)} />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {settingsOpen && <Settings initialKey={key} onSave={saveKey} onClose={() => setSettingsOpen(false)} />}
      </AnimatePresence>
    </div>
  )
}

const session = ({ id, topic, minutes, brief }: Session): Session => ({ id, topic, minutes, brief })

function SharedResult({ id, isOwner, onNewTopic }: { id: string; isOwner: boolean; onNewTopic: () => void }) {
  const [result, setResult] = useState<PublicResult | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.result(id).then(setResult).catch((e) => setError(e instanceof Error ? e.message : 'Could not load this result.'))
  }, [id])

  if (result) return <Result result={result} isOwner={isOwner} onNewTopic={onNewTopic} />
  return (
    <Screen>
      {error ? (
        <div className="stack">
          <Banner message={error} />
          <div><Button variant="signal" onClick={onNewTopic}>Start your own</Button></div>
        </div>
      ) : (
        <ProgressLine />
      )}
    </Screen>
  )
}
