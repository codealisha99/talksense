import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import Composer, { focusComposer } from './Composer.tsx'
import LoopDemo from './LoopDemo.tsx'
import RubricExplorer from './RubricExplorer.tsx'
import Specimen from './Specimen.tsx'
import { Arrow, Button, Screen, easeOut, item, list } from '../primitives.tsx'

type Props = {
  hasKey: boolean
  busy: boolean
  onStart: (topic: string, minutes: number) => void
  onNeedKey: (pending: { topic: string; minutes: number } | null) => void
}

// First-visit home: the product itself is the hero; everything below explains it truthfully.
export default function Landing(props: Props) {
  return (
    <Screen className="landing">
      <div className="hero-wrap">
      <motion.header className="hero" variants={list} initial="hidden" animate="show">
        <motion.p className="kicker" variants={item}>An oral exam for anything you're curious about</motion.p>
        <motion.h1 className="display" variants={item}>
          Learn anything in 20 minutes.<br />
          <em>Then say it out loud.</em>
        </motion.h1>
        <motion.p className="lede hero-lede" variants={item}>
          Talksense writes you a short brief, times your study, listens while you explain the topic back,
          and grades your understanding on a clear four-part rubric.
        </motion.p>
        <motion.div variants={item}>
          <Composer {...props} label="What do you want to understand?" />
        </motion.div>
        <motion.a variants={item} className="hero-secondary" href="#how">See how a session works ↓</motion.a>
      </motion.header>
      <Specimen />
      </div>

      <Section id="how" kicker="How it works" title="One session, four steps.">
        <LoopDemo />
      </Section>

      <Section id="why" kicker="Why talk it through" title={<>Reading feels like learning. <mark>Explaining proves it.</mark></>}>
        <div className="compare">
          <div className="compare-col">
            <p className="kicker">Most learning stops at input</p>
            <ul className="struck">
              {['Highlight the key paragraph', 'Save the video for later', 'Re-read the summary', 'Nod along, feel productive'].map((t, i) => (
                <li key={t}>
                  <span>{t}</span>
                  <svg className="strike" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden>
                    <motion.path d="M1 6 C 30 3, 60 8, 99 4" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true, margin: '-15%' }} transition={{ delay: 0.25 + i * 0.18, duration: 0.5, ease: easeOut }} />
                  </svg>
                </li>
              ))}
            </ul>
            <p className="fine">It feels like progress, but nothing tells you what you missed.</p>
          </div>
          <div className="compare-col">
            <p className="kicker" style={{ color: 'var(--signal)' }}>Talksense ends with output</p>
            <ol className="objectives">
              {['You explain it, unprompted, in your own words', 'Each objective is marked covered, partial or missed', 'Mistakes are named, with what you actually said', 'You get specific next steps for the gaps'].map((t, i) => (
                <li key={t}><span className="n">{String(i + 1).padStart(2, '0')}</span><span>{t}</span></li>
              ))}
            </ol>
          </div>
        </div>
      </Section>

      <Section id="rubric" kicker="The rubric" title="Graded the same way every time.">
        <p className="lede">
          The AI marks four parts from 0 to 4. The total out of 100 is calculated from fixed weights in our code,
          not by the AI, so scores mean the same thing across topics. Pick a part to see what each mark means.
        </p>
        <RubricExplorer />
      </Section>

      <Section id="privacy" kicker="Your key, your words" title="Nothing hidden about how it runs.">
        <dl className="facts">
          <Fact term="Your own OpenAI key">Saved only in this browser and sent with each request. Our server forwards it to OpenAI and never stores or logs it.</Fact>
          <Fact term="Your voice">Sent to OpenAI to be transcribed. We keep the text transcript with your session, not the audio.</Fact>
          <Fact term="No account">Your history is tied to this browser. Clearing site data starts you fresh.</Fact>
          <Fact term="Shared results">Anyone with a result's link sees the topic, score, feedback and short quotes the grader cites. Never the full transcript.</Fact>
        </dl>
      </Section>

      <Section id="faq" kicker="Questions" title="Before you start.">
        <div className="faq">
          <Faq q="What does a session cost?">
            You pay OpenAI directly at their rates. A session makes one short call for the brief, one transcription
            if you speak, and one call to grade. Each “Surprise me” roll is one more short call.
          </Faq>
          <Faq q="Can I type instead of speaking?">Yes. Speaking is the point, but typing works the same way and is graded on the same rubric.</Faq>
          <Faq q="How long can I talk?">Up to 10 minutes per answer. Most explanations take two to five.</Faq>
          <Faq q="What topics work?">Anything you can explain in words: how something works, why something happens, a technique, an event, an idea.</Faq>
          <Faq q="What if something fails halfway?">Your explanation is kept. If only the rating failed, you can retry it without recording again.</Faq>
        </div>
      </Section>

      <section className="closing">
        <h2 className="display small">What will you explain first?</h2>
        <Button variant="signal" onClick={focusComposer}>Pick a topic <Arrow /></Button>
      </section>

      <footer className="footer">
        <span className="wordmark static"><span className="dot" />talksense</span>
        <nav aria-label="On this page">
          <a href="#how">How it works</a>
          <a href="#rubric">Rubric</a>
          <a href="#privacy">Privacy</a>
          <a href="#faq">Questions</a>
        </nav>
        <p className="fine">Study anything. Explain it out loud. Find out what you really understood.</p>
      </footer>
    </Screen>
  )
}

function Section({ id, kicker, title, children }: { id: string; kicker: string; title: ReactNode; children: ReactNode }) {
  return (
    <motion.section
      id={id}
      className="section"
      aria-labelledby={`${id}-title`}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10%' }}
      transition={{ duration: 0.6, ease: easeOut }}
    >
      <p className="kicker">{kicker}</p>
      <h2 id={`${id}-title`} className="title section-title">{title}</h2>
      {children}
    </motion.section>
  )
}

function Fact({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="fact">
      <dt>{term}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function Faq({ q, children }: { q: string; children: ReactNode }) {
  return (
    <details className="faq-item">
      <summary>{q}<span aria-hidden className="faq-mark">+</span></summary>
      <p>{children}</p>
    </details>
  )
}
