import { useCallback, useEffect, useRef, useState } from 'react'

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'
const SPIN_MS = 45
const SETTLE_FRAMES = 22
const SPIN_LENGTH = 26

const randomLetter = () => LETTERS[Math.floor(Math.random() * LETTERS.length)]
const noise = (template: string) => [...template].map((ch) => (ch === ' ' ? ' ' : randomLetter())).join('')
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Slot-machine text: `spin()` shows shuffling letters while we wait on the network,
 * `settle(text)` decodes left-to-right into the real text. `display` is null when idle.
 */
export function useScramble() {
  const [display, setDisplay] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const stop = () => window.clearInterval(timer.current)

  useEffect(() => stop, [])

  const spin = useCallback(() => {
    stop()
    if (reducedMotion()) return setDisplay('…')
    const template = 'xxxx xxxxx xx xxx xxxxxxx'.slice(0, SPIN_LENGTH)
    timer.current = window.setInterval(() => setDisplay(noise(template)), SPIN_MS)
  }, [])

  const settle = useCallback((text: string) => new Promise<void>((resolve) => {
    stop()
    if (reducedMotion()) {
      setDisplay(null)
      return resolve()
    }
    let frame = 0
    timer.current = window.setInterval(() => {
      frame += 1
      const revealed = Math.ceil((text.length * frame) / SETTLE_FRAMES)
      setDisplay(text.slice(0, revealed) + noise(text.slice(revealed)))
      if (frame >= SETTLE_FRAMES) {
        stop()
        setDisplay(null)
        resolve()
      }
    }, SPIN_MS)
  }), [])

  const cancel = useCallback(() => { stop(); setDisplay(null) }, [])

  return { display, spin, settle, cancel }
}
