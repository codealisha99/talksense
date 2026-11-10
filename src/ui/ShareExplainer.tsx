import { motion } from 'motion/react'
import LoopDemo from './home/LoopDemo.tsx'
import { Arrow, Button, easeOut } from './primitives.tsx'

/** Shown under someone else's shared result: how that score was earned, and how to get your own. */
export default function ShareExplainer({ onStart }: { onStart: () => void }) {
  return (
    <motion.section
      className="section share-explainer"
      aria-labelledby="share-explainer-title"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10%' }}
      transition={{ duration: 0.6, ease: easeOut }}
    >
      <p className="kicker">What is Talksense?</p>
      <h2 id="share-explainer-title" className="title section-title">This score was earned out loud.</h2>
      <p className="lede">
        They picked a topic, studied it for up to 30 minutes, then explained it in their own words.
        Talksense graded the explanation on the same four-part rubric everyone gets.
      </p>
      <LoopDemo />
      <div><Button variant="signal" onClick={onStart}>Try your own topic <Arrow /></Button></div>
    </motion.section>
  )
}
