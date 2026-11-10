import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Button, spring } from './primitives.tsx'

const KEY_PATTERN = /^sk-[\w-]{20,300}$/

type Props = { initialKey: string; onSave: (key: string) => void; onClose: () => void }

export default function Settings({ initialKey, onSave, onClose }: Props) {
  const [key, setKey] = useState(initialKey)
  const valid = KEY_PATTERN.test(key)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <motion.div className="overlay" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div
        className="panel sheet stack"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 40, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 24, opacity: 0, scale: 0.98 }}
        transition={spring}
      >
        <p className="kicker" style={{ margin: 0 }}>Settings</p>
        <h2 id="settings-title" className="title" style={{ fontSize: 34 }}>Your OpenAI key</h2>
        <p className="fine" style={{ margin: 0 }}>
          Talksense uses your own key to write briefs, transcribe your voice and grade it. It's saved only in this
          browser and sent with each request to OpenAI. We never store it.{' '}
          <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">Get a key ↗</a>
        </p>
        <div className="field">
          <label htmlFor="key" className="kicker">API key</label>
          <input
            id="key"
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder="sk-…"
            autoFocus
            value={key}
            onChange={(e) => setKey(e.target.value.trim())}
            onKeyDown={(e) => e.key === 'Enter' && valid && onSave(key)}
          />
          {key && !valid && <span className="fine" style={{ color: 'var(--bad)' }}>That doesn't look like an OpenAI key (it starts with “sk-”).</span>}
        </div>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          {initialKey ? <Button variant="quiet" onClick={() => onSave('')}>Remove key</Button> : <span />}
          <div className="row">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="signal" disabled={!valid} onClick={() => onSave(key)}>Save</Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
