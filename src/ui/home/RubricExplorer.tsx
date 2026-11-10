import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { DIMENSIONS, LEVELS, type DimensionId } from '../../rubric.ts'
import { easeOut, spring } from '../primitives.tsx'

/** "0 = a; 2 = b; 4 = c" -> [{ mark: '0', text: 'a' }, ...]. Anchors are the grader's actual instructions. */
export function parseAnchors(anchors: string) {
  return anchors.split(';').map((part) => {
    const [mark, ...rest] = part.split('=')
    return { mark: mark.trim(), text: rest.join('=').trim() }
  })
}

// Score bands, highest first in LEVELS; shown low-to-high here.
const BANDS = [...LEVELS].reverse().map((l, i, all) => ({ name: l.name, from: l.min, to: (all[i + 1]?.min ?? 101) - 1 }))

export default function RubricExplorer() {
  const [selected, setSelected] = useState<DimensionId>(DIMENSIONS[0].id)
  const dim = DIMENSIONS.find((d) => d.id === selected)!

  return (
    <div className="rubric-explorer">
      <div className="weight-bar" role="group" aria-label="Rubric parts and their weight in the score">
        {DIMENSIONS.map((d) => (
          <button
            key={d.id}
            className="weight-seg"
            style={{ flexGrow: d.weight }}
            aria-pressed={d.id === selected}
            onClick={() => setSelected(d.id)}
          >
            {d.id === selected && <motion.span layoutId="weight-active" className="weight-active" transition={spring} />}
            <span className="weight-label">{d.label}</span>
            <span className="weight-pct">{Math.round(d.weight * 100)}%</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={dim.id}
          className="anchors"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6, transition: { duration: 0.15 } }}
          transition={{ duration: 0.35, ease: easeOut }}
          aria-live="polite"
        >
          {parseAnchors(dim.anchors).map((a) => (
            <div key={a.mark} className="anchor">
              <span className="anchor-mark" aria-label={`Score ${a.mark} of 4`}>{a.mark}<small>/4</small></span>
              <p>{a.text}</p>
            </div>
          ))}
        </motion.div>
      </AnimatePresence>

      <div className="bands" aria-label="Levels by total score">
        {BANDS.map((b) => (
          <div key={b.name} className="band" style={{ flexGrow: b.to - b.from + 1 }}>
            <span className="band-name">{b.name}</span>
            <span className="band-range">{b.from}–{b.to}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
