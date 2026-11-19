<img src="assets/icon.svg" width="64" height="64" alt="">

# talksense

Learn anything in 20 minutes, then prove it out loud.

1. **Pick a topic** and a study time (15 / 20 / 30 min).
2. **Get a brief**: 3–5 concrete things you should be able to explain, key terms, and places to start.
3. **Study anywhere** while the dial timer runs.
4. **Explain it out loud.** Your voice is transcribed with OpenAI with word timestamps, then graded against a fixed knowledge rubric and analyzed by the **TalkSense Speech Analysis Engine**.
5. **Get rated and review**: Dual-view report separating **Oral Exam Understanding** from **Speech Delivery Intelligence** (Pace, Fillers, Pauses, Repetition, Grammar, and Voice Acoustics).
6. **Share** a public result page on X or LinkedIn.

Live: https://web-production-c32cc2.up.railway.app

---

## Architecture: Understanding Score vs. Speech Delivery

TalkSense strictly separates **what you know** from **how you speak**:
- **Knowledge Assessment (Oral Exam Rubric)**: Fixed 0–100 rubric evaluating comprehension, coverage, accuracy, and depth.
- **Speech Intelligence Engine v1**: Objective, signal-backed speech delivery metrics. Every metric includes explicit formulas, timestamps, confidence scores, and raw evidence.

```
                              User Spoken Audio
                                      │
               ┌──────────────────────┴──────────────────────┐
               ▼                                             ▼
       Transcribe & Format                         Audio Storage Engine
  (verbose_json word alignment)              (Local / Cloud Sandboxed Storage)
               │                                             │
               ▼                                             ▼
   TranscriptionNormalizer                         Digital Signal Processing
  (temporal validation & sanitization)             (Hann windowing, RMS energy,
               │                                      autocorrelation F0 pitch)
               ▼                                             │
┌─────────────────────────────────────────────────────────┐  │
│              Speech Analysis Pipeline                   │  │
│  ┌───────────────┬────────────────┬──────────────────┐  │  │
│  │ Pace Engine   │ Filler Engine  │ Pause Engine     │  │  │
│  │ (Active WPM)  │ (Context Clf)  │ (Hesitation)     │  │  │
│  ├───────────────┼────────────────┼──────────────────┤  │  │
│  │ Repetition    │ Language Engine│ Acoustic DSP     │◄─┴──┘
│  │ (Stutters)    │ (TTR & MATTR)  │ (Pitch Variation)│
│  └───────────────┴────────────────┴──────────────────┘
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
                 Unified SpeechReport JSON
```

---

## Speech Analysis Engine Modules

### 1. Speaking Pace
- **Overall WPM**: Standard speech rate across full audio duration ($W / T_{\text{total}} \times 60$).
- **Active Speaking WPM**: Articulation pace computed by excluding pause intervals $\ge 0.5$s ($W / T_{\text{active}} \times 60$).
- **Tempo Classification**: Categorized into `VERY_SLOW`, `SLOW`, `MODERATE` (130–165 WPM target), `FAST`, and `VERY_FAST`.
- **Rolling Windows**: 15-second sliding windows showing pacing consistency across the recording.

### 2. Context-Aware Filler Word Detection
- **Multi-Word & Single-Word Candidates**: Scans for fillers (`um`, `uh`, `er`, `you know`, `kind of`, `sort of`, `like`, `actually`, `basically`).
- **Contextual Syntax Classifier**: Distinguishes disfluent fillers from legitimate semantic usage:
  - *"I like machine learning"* $\rightarrow$ `MEANINGFUL_USAGE` (transitive verb).
  - *"Algorithms like quicksort"* $\rightarrow$ `MEANINGFUL_USAGE` (prepositional exemplar).
  - *"Actually, the answer is..."* $\rightarrow$ `DISCOURSE_MARKER`.
  - *"It was, like, difficult"* $\rightarrow$ `CONFIRMED_FILLER` (parenthetical hesitation).
- **Filler Rate**: Rate of confirmed fillers per 100 spoken words with timeline histogram.

### 3. Pause & Hesitation Analysis
- **Inter-Word Gap Classification**: Distinguishes normal articulation ($< 0.25$s), grammatical pauses at punctuation ($0.25\text{s} - 1.5\text{s}$), and hesitation stops mid-clause ($> 0.5$s).
- **Metrics**: Total pause duration, pauses per minute, silence ratio, and awkward hesitation cue detection.

### 4. Repetition & False Starts
- **Consecutive Stutters**: Detects immediate word repetitions (*"we we we"*) distinguishing intentional rhetoric from hesitation.
- **Phrase Restarts**: Detects 2-to-4 word restarts (*"we need to build, we need to build"*).
- **Semantic Repetition**: Sentence-level n-gram overlap flags redundant arguments.

### 5. Grammar & Vocabulary Quality
- **Vocabulary Diversity**: Type-Token Ratio (TTR) and Moving-Average Type-Token Ratio (MATTR) with fixed 50-word windows.
- **Spoken Grammar Diagnostics**: Detects subject-verb disagreement, tense slips, and filters out common ASR homophone artifacts.

### 6. Voice Acoustics (DSP)
- **Signal Processing**: 16-bit PCM WAV decoding, Hann windowing (30ms frames, 10ms hop).
- **Loudness & Dynamics**: RMS energy in dBFS and dynamic range calculation.
- **Pitch Extraction**: Autocorrelation fundamental frequency estimation ($F_0 \in [75, 450]\text{ Hz}$) with voiced frame ratio and vocal monotony categorization (`MONOTONE`, `BALANCED`, `HIGH_VARIATION`).
- **Graceful Degradation**: Audio containers lacking raw PCM (e.g. lossy WebM/MP4) degrade gracefully with diagnostic notices without halting analysis.

### 7. Audio Storage & Privacy
- **Local Sandbox Storage**: `LocalAudioStorageProvider` stores recordings securely in `.data/recordings/` with path traversal guards.
- **Streaming Playback**: Playback endpoint `GET /api/recordings/:id/audio` supports range requests and audio seeking.
- **Privacy & GDPR Compliance**: Explicit recording consent flag and one-click permanent deletion `DELETE /api/recordings/:id`.

---

## Rubric (Knowledge Assessment)

Every topic uses the same four parts, each scored 0–4 by the model. The 0–100 total is computed on the
server (`src/rubric.ts`), so shared scores can't be forged by the client.

| Part | Weight | 0 | 4 |
|---|---|---|---|
| Coverage | 35% | no objectives addressed | every objective addressed |
| Accuracy | 30% | major misconceptions | no factual errors |
| Depth | 20% | only names terms | explains why and how, with examples |
| Clarity | 15% | incoherent | could teach a beginner |

Levels: Novice < 40 ≤ Apprentice < 60 ≤ Practitioner < 75 ≤ Expert < 90 ≤ Master.

---

## Stack

- **Client**: React 19 + Vite 8 + `motion`. Audio player with timestamp seek, interactive transcript highlighter, pacing gauge.
- **Server**: Hono on Node 24 (runs TypeScript directly), Zod schema validation, per-IP rate limit.
- **Speech Engine**: Pure TypeScript signal processing and NLP pipeline without heavy native C++ dependencies.
- **DB**: Neon Postgres (`sessions` and `recordings` tables, auto-migrated on boot).
- **AI**: Bring-your-own OpenAI key forwarded per request; the server never stores or logs it.
- **Hosting**: Railway (`railway.json`).

---

## Develop

```bash
npm install
echo "DATABASE_URL=postgres://…" > .env
npm run dev:api   # API on :3000
npm run dev       # app on :5173, proxies /api
npm test          # full suite: 69 tests (knowledge rubric, speech engines, benchmark)
npm run build     # typecheck and production Vite bundle
```

### Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | Neon Postgres connection string | *(required for DB persistence)* |
| `CHAT_MODEL` | OpenAI model for topic and grading | `gpt-6-astra` |
| `TRANSCRIBE_MODEL` | OpenAI transcription model | `gpt-transcribe` |
| `PORT` | API server port | `3000` |
| `AUDIO_STORAGE_DIR` | Local directory for sandboxed audio recordings | `.data/recordings` |
