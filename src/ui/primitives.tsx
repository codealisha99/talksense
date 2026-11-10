import { motion, type HTMLMotionProps } from 'motion/react'
import type { ReactNode } from 'react'

export const spring = { type: 'spring', stiffness: 380, damping: 32 } as const
export const easeOut = [0.22, 1, 0.36, 1] as const

type ButtonProps = HTMLMotionProps<'button'> & { variant?: 'ink' | 'signal' | 'ghost' | 'quiet' }

export function Button({ variant = 'ink', className = '', children, ...rest }: ButtonProps) {
  return (
    <motion.button
      whileTap={rest.disabled ? undefined : { scale: 0.97 }}
      transition={spring}
      className={`btn ${variant === 'ink' ? '' : variant} ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  )
}

export const Arrow = () => <span className="arrow" aria-hidden>→</span>

/** Every screen enters the same way: rises a little out of a soft blur. */
export function Screen({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.section
      className={`screen ${className}`}
      initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -10, filter: 'blur(6px)', transition: { duration: 0.18 } }}
      transition={{ duration: 0.5, ease: easeOut }}
    >
      {children}
    </motion.section>
  )
}

export function Banner({ message }: { message: string }) {
  return (
    <motion.div
      key={message}
      role="alert"
      className="banner"
      initial={{ opacity: 0, x: 0 }}
      animate={{ opacity: 1, x: [0, -6, 6, -3, 3, 0] }}
      transition={{ duration: 0.4 }}
    >
      <b>ERROR</b>
      <span>{message}</span>
    </motion.div>
  )
}

export function ProgressLine() {
  return (
    <div className="progress-line" aria-hidden>
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: '260%' }}
        transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}

/** Stagger children in, used for lists that should "deal" onto the page. */
export const list = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
}
export const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: easeOut } },
}

export const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
