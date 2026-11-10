import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, api, getKey, setKey } from './api.ts'
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
  // draft: typed text to restore after a failure; transcript: saved on the server, only grading is pending.
  | ({ stage: 'answer'; draft?: string; transcript?: string } & Session)
  | ({ stage: 'processing'; step: Step; transcript: string } & Session)
  | { stage: 'result'; result: PublicResult; transcript: string }

const FLOW_STORAGE = 'talksense.flow'
const HOME: Flow = { stage: 'home' }

/** Restore an in-progress session after a reload; a request that was in flight resumes at the answer step. */
function loadFlow(): Flow {
  try {
    const saved = JSON.parse(localStorage.getItem(FLOW_STORAGE) ?? 'null') as Flow | null
    if (!saved) return HOME
    if (saved.stage === 'processing') {
      const transcript = saved.step === 'grading' ? saved.transcript : undefined
      return { stage: 'answer', ...session(saved), transcript }
    }
    return saved
  } catch {
    return HOME
  }
}

// Resending the same input can't succeed: it must change (400/413/422) or the session is gone or done (404/409).
const NEEDS_NEW_INPUT = new Set([400, 404, 409, 413, 422])

type Answer = { audio: Blob } | { text: string } | { transcript: string }

const shareId = (path: string) => /^\/r\/([0-9a-f-]{36})\/?$/i.exec(path)?.[1] ?? null

export default function App() {
  const [path, setPath] = useState(location.pathname)
  const [flow, setFlow] = useState<Flow>(loadFlow)
  const [key, setKeyState] = useState(getKey)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [pastSessions, setPastSessions] = useState<HistoryItem[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const pendingAudio = useRef<Blob | null>(null) // a recording whose upload failed for a transient reason

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

  /** Transcribe (unless already saved), then grade. On failure, keep whatever work survived so it can be retried. */
  async function submit(s: Session, input: Answer) {
    let transcript = 'transcript' in input ? input.transcript : undefined
    go({ stage: 'processing', ...session(s), step: transcript === undefined ? 'transcribing' : 'grading', transcript: transcript ?? '' })
    try {
      if (!('transcript' in input)) {
        const saved = 'audio' in input ? await api.transcribeAudio(s.id, input.audio) : await api.submitText(s.id, input.text)
        transcript = saved.transcript
        setFlow({ stage: 'processing', ...session(s), step: 'grading', transcript })
      }
      const result = await api.grade(s.id)
      pendingAudio.current = null
      go({ stage: 'result', result, transcript: transcript ?? '' }) // always set by this point
      refreshHistory()
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 0
      const resendable = transcript === undefined && 'audio' in input && !NEEDS_NEW_INPUT.has(status)
      pendingAudio.current = resendable ? input.audio : null
      setFlow({ stage: 'answer', ...session(s), draft: 'text' in input ? input.text : undefined, transcript })
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    }
  }

  const retryFor = (f: Extract<Flow, { stage: 'answer' }>) => {
    const saved = f.transcript
    if (saved !== undefined) return () => submit(f, { transcript: saved })
    const audio = pendingAudio.current
    return audio ? () => submit(f, { audio }) : undefined
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
                draft={flow.draft} saved={flow.transcript !== undefined} onRetry={retryFor(flow)}
                onAudio={(audio) => submit(flow, { audio })}
                onText={(text) => submit(flow, { text })} />
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
