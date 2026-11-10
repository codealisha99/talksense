import { useEffect, useRef, useState } from 'react'

const MAX_RECORD_MS = 10 * 60 * 1000 // keeps uploads well under OpenAI's 25 MB audio limit

type Props = { onAudio: (audio: Blob) => void; onText: (text: string) => void }

export default function Answer({ onAudio, onText }: Props) {
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState('')
  const [typed, setTyped] = useState('')
  const [typing, setTyping] = useState(false)
  const recorder = useRef<MediaRecorder | null>(null)

  useEffect(() => {
    if (!recording) return
    const start = Date.now()
    const tick = setInterval(() => {
      const ms = Date.now() - start
      setElapsed(Math.floor(ms / 1000))
      if (ms >= MAX_RECORD_MS) recorder.current?.stop()
    }, 500)
    return () => clearInterval(tick)
  }, [recording])

  // Release the mic if the user navigates away mid-recording.
  useEffect(() => () => recorder.current?.stream.getTracks().forEach((t) => t.stop()), [])

  async function start() {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      const chunks: Blob[] = []
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        setRecording(false)
        onAudio(new Blob(chunks, { type: rec.mimeType }))
      }
      rec.start()
      recorder.current = rec
      setElapsed(0)
      setRecording(true)
    } catch {
      setError('Microphone unavailable or blocked. Allow mic access, or type your explanation instead.')
      setTyping(true)
    }
  }

  const mmss = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`

  if (typing) {
    return (
      <div className="stack">
        {error && <p className="error" role="alert">{error}</p>}
        <label htmlFor="typed">Explain the topic in your own words</label>
        <textarea id="typed" rows={10} value={typed} onChange={(e) => setTyped(e.target.value)} />
        <div className="row">
          <button onClick={() => onText(typed)} disabled={!typed.trim()}>Submit for rating</button>
          <button className="ghost" onClick={() => setTyping(false)}>Use mic instead</button>
        </div>
      </div>
    )
  }

  return (
    <div className="stack center">
      {recording ? (
        <>
          <p className="big" aria-live="polite">🔴 {mmss}</p>
          <button onClick={() => recorder.current?.stop()}>Stop & get my rating</button>
        </>
      ) : (
        <>
          <button className="mic" onClick={start}>🎙️ Start talking</button>
          <button className="ghost" onClick={() => setTyping(true)}>Type instead</button>
        </>
      )}
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  )
}
