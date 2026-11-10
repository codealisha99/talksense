import { useEffect, useState } from 'react'
import Answer from './Answer.tsx'
import { structured, transcribe } from './openai.ts'
import {
  BRIEF_SCHEMA, DIMENSIONS, GRADE_SCHEMA, MIN_ANSWER_WORDS, briefPrompt, gradePrompt, levelFor,
  shareText, totalScore, wordCount, type Brief, type Grade,
} from './rubric.ts'

const DURATIONS = [15, 20, 30]
// Model IDs as of Nov 2026; editable in Settings so a rename never breaks the app.
const DEFAULT_SETTINGS = { key: '', chatModel: 'gpt-6-astra', transcribeModel: 'gpt-transcribe' }
type Settings = typeof DEFAULT_SETTINGS

type Stage = 'topic' | 'brief' | 'study' | 'answer' | 'working' | 'result'

function loadSettings(): Settings {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem('talksense.settings') ?? '{}') }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export default function App() {
  const [settings, setSettings] = useState(loadSettings)
  const [showSettings, setShowSettings] = useState(!settings.key)
  const [stage, setStage] = useState<Stage>('topic')
  const [topic, setTopic] = useState('')
  const [minutes, setMinutes] = useState(20)
  const [brief, setBrief] = useState<Brief | null>(null)
  const [studyStart, setStudyStart] = useState(0)
  const [studied, setStudied] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [grade, setGrade] = useState<Grade | null>(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  function saveSettings(next: Settings) {
    localStorage.setItem('talksense.settings', JSON.stringify(next))
    setSettings(next)
    setShowSettings(false)
  }

  async function run<T>(label: string, task: () => Promise<T>): Promise<T | undefined> {
    setError('')
    setBusy(label)
    try {
      return await task()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBusy('')
    }
  }

  async function makeBrief() {
    const t = topic.trim()
    if (!t) return
    const b = await run('Working out what you should know…', () =>
      structured<Brief>(settings.key, settings.chatModel, 'brief', BRIEF_SCHEMA, briefPrompt(t, minutes)),
    )
    if (b) { setBrief(b); setStage('brief') }
  }

  function finishStudy() {
    setStudied(Math.max(1, Math.round((Date.now() - studyStart) / 60000)))
    document.title = '⏰ Your turn: Talksense'
    setStage('answer')
  }

  async function rate(text: string) {
    if (wordCount(text) < MIN_ANSWER_WORDS) {
      setError(`That was only ${wordCount(text)} words. Explain in more detail (at least ${MIN_ANSWER_WORDS}) and try again.`)
      setStage('answer')
      return
    }
    setTranscript(text)
    const g = await run('Rating your understanding…', () =>
      structured<Grade>(settings.key, settings.chatModel, 'grade', GRADE_SCHEMA, gradePrompt(topic, brief!, text)),
    )
    setStage(g ? 'result' : 'answer')
    if (g) setGrade(g)
  }

  async function onAudio(audio: Blob) {
    setStage('working')
    const text = await run('Transcribing what you said…', () => transcribe(settings.key, settings.transcribeModel, audio))
    if (text === undefined) return setStage('answer')
    await rate(text)
  }

  function restart() {
    document.title = 'Talksense'
    setStage('topic'); setBrief(null); setGrade(null); setTranscript(''); setError('')
  }

  if (showSettings) return <SettingsForm initial={settings} onSave={saveSettings} />

  return (
    <main>
      <header className="row between">
        <h1 onClick={restart}>Talksense</h1>
        <button className="ghost" onClick={() => setShowSettings(true)}>Settings</button>
      </header>

      {error && <p className="error" role="alert">{error}</p>}
      {busy && <p className="busy" aria-live="polite">{busy}</p>}

      {stage === 'topic' && (
        <section className="stack">
          <label htmlFor="topic">What do you want to understand?</label>
          <input id="topic" value={topic} maxLength={120} placeholder="e.g. How sourdough fermentation works"
            onChange={(e) => setTopic(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && makeBrief()} />
          <p>How long will you study?</p>
          <div className="row">
            {DURATIONS.map((m) => (
              <button key={m} className={m === minutes ? '' : 'ghost'} aria-pressed={m === minutes} onClick={() => setMinutes(m)}>
                {m} min
              </button>
            ))}
          </div>
          <button onClick={makeBrief} disabled={!topic.trim() || !!busy}>Show me what I should know</button>
        </section>
      )}

      {stage === 'brief' && brief && (
        <section className="stack">
          <h2>{topic}</h2>
          <p>In {minutes} minutes, read or watch anything you like. When you come back, explain it out loud. We'll check that you can:</p>
          <ol>{brief.objectives.map((o) => <li key={o}>{o}</li>)}</ol>
          <p><strong>Key terms:</strong> {brief.keyTerms.join(' · ')}</p>
          <p><strong>Places to start:</strong></p>
          <ul>
            {brief.searchQueries.map((q) => (
              <li key={q}>
                {q}: <a href={`https://www.google.com/search?q=${encodeURIComponent(q)}`} target="_blank" rel="noreferrer">Google</a>
                {' · '}<a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`} target="_blank" rel="noreferrer">YouTube</a>
              </li>
            ))}
          </ul>
          <button onClick={() => { setStudyStart(Date.now()); setStage('study') }}>Start {minutes}-minute timer</button>
        </section>
      )}

      {stage === 'study' && <Timer endAt={studyStart + minutes * 60000} onDone={finishStudy} />}

      {stage === 'answer' && (
        <section className="stack">
          <h2>Explain “{topic}” in your own words</h2>
          <p>Cover the objectives below. Pretend you're teaching a friend.</p>
          <ol>{brief?.objectives.map((o) => <li key={o}>{o}</li>)}</ol>
          <Answer onAudio={onAudio} onText={(t) => { setStage('working'); rate(t) }} />
        </section>
      )}

      {stage === 'result' && grade && (
        <Result topic={topic} minutes={studied} grade={grade} transcript={transcript} onRestart={restart} />
      )}
    </main>
  )
}

function Timer({ endAt, onDone }: { endAt: number; onDone: () => void }) {
  const [now, setNow] = useState(Date.now())
  const left = Math.max(0, endAt - now)
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  useEffect(() => { if (left === 0) onDone() }, [left === 0]) // eslint-disable-line react-hooks/exhaustive-deps
  const mmss = `${Math.floor(left / 60000)}:${String(Math.floor((left % 60000) / 1000)).padStart(2, '0')}`
  useEffect(() => { document.title = `${mmss} · Talksense` }, [mmss])
  return (
    <section className="stack center">
      <p className="clock" role="timer">{mmss}</p>
      <p>Go learn. This tab will flip to “Your turn” when time is up.</p>
      <button className="ghost" onClick={onDone}>I'm ready early</button>
    </section>
  )
}

function Result({ topic, minutes, grade, transcript, onRestart }: {
  topic: string; minutes: number; grade: Grade; transcript: string; onRestart: () => void
}) {
  const score = totalScore(grade.dimensions)
  const text = shareText(topic, score, minutes)
  const icon = { covered: '✅', partial: '🟡', missed: '❌' }
  return (
    <section className="stack">
      <div className="score">
        <span className="big">{score}</span>/100 · <strong>{levelFor(score)}</strong>
      </div>
      <p>{grade.summary}</p>
      <table>
        <tbody>
          {DIMENSIONS.map((d) => (
            <tr key={d.id}>
              <th>{d.label} <small>({Math.round(d.weight * 100)}%)</small></th>
              <td>{grade.dimensions[d.id].score}/4</td>
              <td>{grade.dimensions[d.id].reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>Objectives</h3>
      <ul className="plain">
        {grade.objectives.map((o) => (
          <li key={o.objective}>{icon[o.status]} {o.objective}{o.evidence && <small> “{o.evidence}”</small>}</li>
        ))}
      </ul>
      {grade.misconceptions.length > 0 && (<><h3>Misconceptions</h3><ul>{grade.misconceptions.map((m) => <li key={m}>{m}</li>)}</ul></>)}
      <h3>Next steps</h3>
      <ul>{grade.nextSteps.map((s) => <li key={s}>{s}</li>)}</ul>
      <div className="row">
        <a className="btn" target="_blank" rel="noreferrer" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`}>Share on X</a>
        <a className="btn" target="_blank" rel="noreferrer" href={`https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`}>Share on LinkedIn</a>
        <button className="ghost" onClick={onRestart}>New topic</button>
      </div>
      <details><summary>What we heard</summary><p>{transcript}</p></details>
    </section>
  )
}

function SettingsForm({ initial, onSave }: { initial: Settings; onSave: (s: Settings) => void }) {
  const [s, setS] = useState(initial)
  const valid = s.key.trim().startsWith('sk-') && s.chatModel.trim() && s.transcribeModel.trim()
  return (
    <main className="stack">
      <h1>Talksense settings</h1>
      <p>Bring your own OpenAI key. It stays in this browser's local storage and is sent only to api.openai.com.</p>
      <label htmlFor="key">OpenAI API key</label>
      <input id="key" type="password" autoComplete="off" value={s.key} onChange={(e) => setS({ ...s, key: e.target.value.trim() })} />
      <label htmlFor="chat">Model for briefs & rating</label>
      <input id="chat" value={s.chatModel} onChange={(e) => setS({ ...s, chatModel: e.target.value.trim() })} />
      <label htmlFor="stt">Transcription model (Whisper)</label>
      <input id="stt" value={s.transcribeModel} onChange={(e) => setS({ ...s, transcribeModel: e.target.value.trim() })} />
      <button disabled={!valid} onClick={() => onSave(s)}>Save</button>
    </main>
  )
}
