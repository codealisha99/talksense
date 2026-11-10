# Talksense design system: "The Oral Exam"

Talksense is an oral exam for anything you're curious about, so it looks like a teacher's marked paper:
ivory paper, ink, a vermilion marking pen, and a highlighter. Tokens live in `src/styles.css`.

## Colour

Every text pairing is at least 4.5:1 (WCAG AA) in both themes, measured from rendered values.

| Token | Light | Dark | Use it for | Never for |
|---|---|---|---|---|
| `--ink` | `#161513` | `#eeeae1` | Text, primary marks, filled rubric cells | — |
| `--signal` (marking pen) | `#b8400e` | `#f07a3e` | Primary actions, the level stamp, the current step, the weakest skill | Decoration, large fills |
| `--hl` (highlighter) | `#f6e27a` | `#5c4f12` | Evidence quoted from the learner, one key phrase per section | Anything else |
| `--paper` / `--card` / `--paper-2` | `#f3efe6` / `#fbf9f4` / `#ebe6da` | `#121110` / `#1b1a18` / `#1a1917` | Page, raised surfaces, recessed surfaces | — |
| `--ink-2` / `--muted` | `#45423b` / `#6b665c` | `#c3bdb1` / `#9a9488` | Secondary text / labels | — |
| `--good` / `--mid` / `--bad` | `#2f6b3f` / `#8a5a00` / `#a8321f` | `#7fbf8e` / `#e0b04a` / `#ee8a76` | Covered / partial / missed, and errors | — |

Text on `--signal` uses `--signal-ink` (white in light mode, near-black in dark mode).

## Type

Three families, each with one job:

- **Instrument Serif** (`--serif`) is the voice of the paper: display text, titles, topics, and the score.
- **Geist** (`--sans`) for UI and body text.
- **Geist Mono** (`--mono`) for anything measured or labelled: time, counts, weights, small caps labels (`.kicker`).

## Layout

- Spacing uses a 4px scale (`--s1` to `--s10`). Radii: `--radius-sm` 8, `--radius` 14, `--radius-lg` 20.
- In-session screens use a single reading column (`--reading`, 760px), so attention stays on the task.
- Home, dashboard and share pages use `--wide` (1120px), with asymmetric compositions.
- Breakpoints: 1100px removes the hero specimen, 960px stacks the loop demo and dashboard, 720px is the phone layout.

## Motion

Motion explains what changed. It never decorates.

- **Durations:** `--dur-fast` 150ms for feedback, `--dur-base` 250ms for state, `--dur-slow` 500ms for reveals.
- **Easing:** `--ease-out` (`cubic-bezier(.22,1,.36,1)`), plus springs for anything that slides between options.
- **Marks draw on:** strike-throughs, checks and trend lines are drawn with `pathLength`.
- **The stamp lands once**, at the moment a score is final.
- **Numbers count up** only when they are newly earned (score reveal), not on every view.
- **Reduced motion:** `MotionConfig reducedMotion="user"` and a global CSS rule. The loop demo stops autoplaying.
- **Gotcha:** `pathLength` animations must not use `vector-effect: non-scaling-stroke`. It breaks the dash pattern and draws broken lines.

## Components

| Component | File | Responsibility |
|---|---|---|
| `Composer` | `src/ui/home/Composer.tsx` | Start a session: topic, duration, Surprise me. Without a key it routes through setup, then continues. |
| `LoopDemo` | `src/ui/home/LoopDemo.tsx` | Explains a session with the real UI elements. Accessible tablist with arrow keys. |
| `RubricExplorer` | `src/ui/home/RubricExplorer.tsx` | Renders the grader's own `DIMENSIONS` and `LEVELS`, so it can never drift from scoring. |
| `Dashboard` + `Insights` | `src/ui/home/` | Returning users: focus next, skill profile, consistency, trend, history. Only real data. |
| `StepRail` | `src/ui/StepRail.tsx` | Where you are in a session. |
| `ShareExplainer` | `src/ui/ShareExplainer.tsx` | Explains Talksense to people arriving from a shared result. |
