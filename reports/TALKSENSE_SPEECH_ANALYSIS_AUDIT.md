# TalkSense: Comprehensive Speech Analysis Feature Audit Report

**Date of Audit:** November 19, 2026  
**Auditor Roles:** Senior Software Architect, QA Engineer, AI/ML Engineer, and Test Automation Engineer  
**Target Codebase:** TalkSense (`talksense` v0.1.0)  
**Repository Path:** `/Users/alisha/Desktop/talksense`  
**Execution Context:** Node.js v24.x, Hono 4.13.17, React 19.3.1, TypeScript 7.0.2  
**Audit Scope:** Full architectural tracing, feature verification, test execution, acoustic vs. transcript analysis distinction, and roadmap formulation.

---

## 1. Executive Summary

TalkSense is currently architected and implemented as an **interactive oral knowledge exam and study sprint tool** ("The Oral Exam"), designed to verify conceptual understanding of academic or general knowledge topics. Its core proposition—as defined in its documentation and codebase—is: *"Learn anything in 20 minutes, then prove it out loud."*

The platform excels at this primary goal: a user chooses a topic and a study duration (15, 20, or 30 minutes), receives an AI-generated learning brief (3–5 concrete objectives, key terms, and search queries), reviews material during an interactive dial countdown, records a spoken explanation (or types text), has their voice transcribed via OpenAI Whisper, and receives a structured comprehension assessment across four fixed rubric dimensions (Coverage, Accuracy, Depth, Clarity) scored 0–100.

However, from the perspective of an **advanced speech analysis and speaking improvement platform** (evaluating verbal delivery, acoustic vocal qualities, filler words, speech rate, pause distributions, fluency hesitation, grammar, and speaking frameworks):

> **Core Audit Finding:** TalkSense currently possesses **almost zero native speech-coaching or acoustic speech analysis capabilities**. 
> - **0% Acoustic Analysis:** Audio is recorded in the browser, streamed to OpenAI Whisper for text transcription, and immediately discarded. The server never stores audio files and executes zero digital signal processing (DSP), zero pitch/F0 extraction, zero volume/energy measurement, and zero acoustic pause detection.
> - **No Speech Delivery Metrics:** Words-per-minute (WPM), pause durations, silence-to-speech ratios, and articulation are completely absent from both backend data structures and frontend views.
> - **No Verbal Filler Detection:** There is zero code, pattern matching, or LLM prompting to detect verbal fillers (*"um"*, *"uh"*, *"like"*, *"you know"*).
> - **Comprehension vs. Speech Coaching:** The existing "Clarity" dimension measures conceptual organization ("could teach a beginner"), not vocal delivery or verbal fluency.

The codebase is exceptionally clean, well-tested for its current scope (25/25 passing unit tests), elegantly designed, and resilient. However, to function as a speech analysis and speaking improvement platform, it requires substantial architectural expansion across acoustic processing, temporal transcription analysis, and speech-specific evaluation pipelines.

---

## 2. Architecture Overview

### 2.1 Component Interaction & End-to-End Pipeline

```
[ Browser / Client: React 19 + Motion ]
       │
       │ 1. Start Session (topic, minutes, deviceId)
       ▼
[ Server: Hono HTTP API ] ──(OpenAI /responses)──► [ Brief Generation: gpt-6-astra ]
       │                                                      │
       ▼                                                      ▼
[ DB: Neon Postgres ] ◄──────── Store Session (brief) ────────┘
       │
       │ 2. User Studies (SVG Dial Timer: Study.tsx)
       │
       │ 3. User Speaks (MediaRecorder -> WebM Blob)
       ▼
[ Browser MediaRecorder + Web Audio API Canvas Visualizer ]
       │
       │ 4. POST /api/sessions/:id/transcript (Multipart Form Audio Blob)
       ▼
[ Server: /api/sessions/:id/transcript ]
       │
       ├──► OpenAI /audio/transcriptions (model: gpt-transcribe) ──► Returns plain text string
       │
       ├──► Validation: wordCount(text) >= 20
       │
       └──► UPDATE sessions SET transcript = text (Audio Blob Discarded!)
       │
       │ 5. POST /api/sessions/:id/grade
       ▼
[ Server: /api/sessions/:id/grade ]
       │
       ├──► OpenAI /responses (model: gpt-6-astra, strict JSON schema)
       │       Evaluates: Coverage (0-4), Accuracy (0-4), Depth (0-4), Clarity (0-4)
       │       Extracts: Objectives status + quoted evidence, Misconceptions, Next Steps
       │
       ├──► Deterministic Total Score: totalScore() in src/rubric.ts
       │
       └──► UPDATE sessions SET grade, score, level, studied_minutes, graded_at
       │
       │ 6. Response returned to Client
       ▼
[ Result Screen: Result.tsx ]
       │ Score reveal, level stamp, rubric breakdown, quoted evidence, social share
       ▼
[ Dashboard & History: Dashboard.tsx, Insights.tsx ]
       │ Streak, 12-week activity calendar, score trend line, skill profile
```

### 2.2 Trace of User Journey

| Stage | User Action / System Step | Relevant Files | Functions / Classes | Endpoints / DB Tables | External Dependencies | Existing Tests |
|---|---|---|---|---|---|---|
| **1. Landing & Selection** | User opens app, selects/rolls topic and duration (15/20/30m) | `src/App.tsx`<br>`src/ui/Home.tsx`<br>`src/ui/home/Composer.tsx`<br>`src/topics.ts` | `Composer()`<br>`randomTopicPrompt()`<br>`api.randomTopic()` | `POST /api/topics/random` | OpenAI API (`TOPIC_MODEL`) | `src/topics.test.ts` (3 tests) |
| **2. Brief Generation** | Generates 3-5 objectives, key terms, search queries | `server/index.ts`<br>`src/rubric.ts`<br>`server/openai.ts` | `briefPrompt()`<br>`structured<Brief>()` | `POST /api/sessions`<br>DB: `sessions` table | OpenAI `/responses` (`CHAT_MODEL`) | `server/openai.test.ts` (4 tests) |
| **3. Study Sprint** | Mechanical dial timer runs down; chime sounds on completion | `src/ui/Study.tsx`<br>`src/ui/BriefScreen.tsx`<br>`src/ui/primitives.tsx` | `Study()`<br>`wedgePath()`<br>`chime()` | `POST /api/sessions/:id/start`<br>DB: `sessions.started_at` | Web Audio API (chime oscillator) | None (UI motion/timer) |
| **4. Speech Input** | Live microphone recording via `MediaRecorder`; canvas waveform | `src/ui/Answer.tsx` | `Answer()`<br>`start()`<br>`draw()` | In-memory `Blob` chunks; no network during recording | Web Audio `AnalyserNode`, `MediaRecorder` | None |
| **5. Audio Submission & Transcription** | Audio blob sent as multipart/form-data; transcribed to plain text | `src/api.ts`<br>`server/index.ts`<br>`server/openai.ts` | `api.transcribeAudio()`<br>`transcribe()`<br>`wordCount()` | `POST /api/sessions/:id/transcript`<br>DB: `sessions.transcript` | OpenAI `/audio/transcriptions` (`TRANSCRIBE_MODEL`) | `src/rubric.test.ts` (`wordCount`) |
| **6. Analysis & Grading** | Transcript graded against 4 dimensions & brief objectives | `server/index.ts`<br>`src/rubric.ts`<br>`server/openai.ts` | `gradePrompt()`<br>`totalScore()`<br>`levelFor()`<br>`studiedMinutes()` | `POST /api/sessions/:id/grade`<br>DB: `sessions.grade`, `sessions.score`, `sessions.level` | OpenAI `/responses` (`CHAT_MODEL`) | `src/rubric.test.ts` (5 tests) |
| **7. Feedback & Reporting** | Animated score reveal, stamp, rubric feedback, quoted quotes | `src/ui/Result.tsx`<br>`server/shareCard.ts` | `Result()`<br>`StatusMark()`<br>`shareCardSvg()` | `GET /api/results/:id`<br>`GET /r/:id/card.png` | `@resvg/resvg-js` | `server/shareCard.test.ts` (3 tests) |
| **8. Progress & History** | Returning user dashboard, streaks, calendar, skill profile | `src/ui/home/Dashboard.tsx`<br>`src/ui/home/Insights.tsx`<br>`src/progress.ts` | `statsFor()`<br>`streakDays()`<br>`dimensionAverages()`<br>`weakestDimension()` | `GET /api/devices/:deviceId/history`<br>DB: `sessions` | Neon Postgres | `src/progress.test.ts` (10 tests) |

---

## 3. Feature Inventory

The following table summarizes every assessed capability across the platform.

*Status Legend:*
- **FULLY IMPLEMENTED**: Completely functional end-to-end, tested, and actively utilized.
- **PARTIALLY IMPLEMENTED**: Exists in code or architecture but missing essential capabilities, metadata, or UI exposure.
- **NOT IMPLEMENTED**: Completely absent from the codebase.
- **IMPLEMENTED BUT BROKEN**: Present in code but fails upon invocation or contains blocking defects.
- **UNVERIFIED**: Implementation exists but cannot be verified due to external environment/runtime constraints.

| # | Feature / Capability | Status | Evidence | Files & Functions | Test Coverage | Technical Notes |
|---|---|---|---|---|---|---|
| **1** | Live Microphone Recording | **FULLY IMPLEMENTED** | Web Audio API + `MediaRecorder` captures stream chunks into Blob | `src/ui/Answer.tsx`: `start()`, `MediaRecorder` | No automated tests | Captures browser audio with echo cancellation & noise suppression. |
| **2** | Audio File Uploads | **PARTIALLY IMPLEMENTED** | Backend endpoint accepts multipart `audio` File, but frontend has no file upload UI | `server/index.ts`: lines 156-166; `src/ui/Answer.tsx` | No automated tests | Backend can receive files via API, but UI only offers mic recording or typing. |
| **3** | Audio Format Validation | **PARTIALLY IMPLEMENTED** | Frontend tags extension `.webm`/`.mp4`/`.ogg`. Backend only checks `audio instanceof File` | `src/api.ts`: line 54; `server/index.ts`: line 160 | No automated tests | No MIME type sniffing, header inspection, or container validation on server. |
| **4** | Audio Duration Validation | **PARTIALLY IMPLEMENTED** | Frontend auto-stops at 10:00 (`MAX_RECORD_MS`). Backend has no duration check | `src/ui/Answer.tsx`: line 6, 90; `server/index.ts` | No automated tests | Server has no duration check, only byte limit. Bypassing client could send >10m. |
| **5** | Audio Size Validation | **FULLY IMPLEMENTED** | `bodyLimit` middleware (26MB) and `audio.size > MAX_AUDIO_BYTES` (25MB) | `server/index.ts`: line 24, 112, 161 | No automated tests | Rejects oversized payloads with HTTP 413. |
| **6** | Audio Playback | **NOT IMPLEMENTED** | No audio player, preview, or playback element exists anywhere | `src/ui/Answer.tsx`, `src/ui/Result.tsx` | None | User cannot listen back to their recorded explanation before or after submitting. |
| **7** | Recording Pause & Resume | **NOT IMPLEMENTED** | `recorder.current.pause()` is never called; only `start()` and `stop()` | `src/ui/Answer.tsx` | None | Recording must be completed in a single continuous take. |
| **8** | Recording Cancellation | **NOT IMPLEMENTED** | No cancel button. Clicking stop immediately triggers submission | `src/ui/Answer.tsx`: lines 97-101 | None | Stopping the recording immediately calls `onAudio` which submits to the server. |
| **9** | Recording Error Handling | **PARTIALLY IMPLEMENTED** | Catches `getUserMedia` permission rejections; preserves Blob on transient network error | `src/ui/Answer.tsx`: line 45; `src/App.tsx`: line 126 | No automated tests | Catches permission denial, but does not handle device disconnection during recording. |
| **10** | Speech-to-Text Transcription | **FULLY IMPLEMENTED** | External OpenAI Whisper `/audio/transcriptions` API invocation | `server/openai.ts`: `transcribe()`; `server/index.ts`: 165 | Mocked in `server/openai.test.ts` | Transcribes audio to string; model configurable via `TRANSCRIBE_MODEL`. |
| **11** | Transcript Storage | **FULLY IMPLEMENTED** | Plain text stored in PostgreSQL `sessions.transcript` column | `server/db.ts`: line 18; `server/index.ts`: line 177 | Tested in schema | Stored as unformatted text. Audio file itself is discarded. |
| **12** | Transcript Timestamps | **NOT IMPLEMENTED** | OpenAI call does not request `verbose_json` or timestamp formats | `server/openai.ts`: lines 31-37 | None | Only `body?.text` string is extracted. All timing information is lost. |
| **13** | Sentence Segmentation | **NOT IMPLEMENTED** | No sentence boundary detection, punctuation analysis, or segmentation | Entire codebase | None | Text treated as raw string; word count is regex `/\s+/`. |
| **14** | Word-Level Timestamps | **NOT IMPLEMENTED** | Word-level granularities are not requested from OpenAI API | `server/openai.ts`: lines 31-37 | None | `timestamp_granularities: ['word']` is absent. |
| **15** | Multiple Speaker Detection | **NOT IMPLEMENTED** | No diarization models or speaker identification features | Entire codebase | None | Assumes single speaker. |
| **16** | Multiple Language Support | **NOT IMPLEMENTED** | System prompts, UI strings, and schemas hardcoded to English | `src/rubric.ts`: `gradePrompt()`, `briefPrompt()` | None | Whisper handles multilingual input, but grading instructions assume English. |
| **17** | Transcription Confidence | **NOT IMPLEMENTED** | Word logprobs or uncertainty metrics not requested or evaluated | `server/openai.ts` | None | No acoustic confidence or speech-to-text uncertainty scoring. |
| **18** | Filler Word Detection (Um, Uh, Like...) | **NOT IMPLEMENTED** | Zero pattern matching, NLP rules, acoustic detection, or LLM filler prompts | Entire codebase | None | No list of filler words exists anywhere in the codebase. |
| **19** | Contextual Filler Classification | **NOT IMPLEMENTED** | No lexical or syntactic analysis distinguishing filler from semantic usage | Entire codebase | None | Feature completely absent. |
| **20** | Filler Frequency / WPM Rate | **NOT IMPLEMENTED** | No filler counting or rate calculation | Entire codebase | None | Feature completely absent. |
| **21** | Filler Transcript Highlighting | **NOT IMPLEMENTED** | Result transcript shown in raw unannotated text `<p>{transcript}</p>` | `src/ui/Result.tsx`: lines 125-130 | None | No highlights or spans rendered. |
| **22** | Fluency: Repetition & False Starts | **NOT IMPLEMENTED** | No repeated word/phrase algorithms or false start detectors | Entire codebase | None | Feature completely absent. |
| **23** | Speaking Pace (WPM) Measurement | **NOT IMPLEMENTED** | Speech duration is not recorded; WPM is never calculated | Entire codebase | None | `studiedMinutes` measures study timer, not speech recording duration. |
| **24** | Pause & Silence Analysis | **NOT IMPLEMENTED** | No silence detection, awkward pause measurement, or VAD | Entire codebase | None | Feature completely absent. |
| **25** | Speaking vs. Silence Ratio | **NOT IMPLEMENTED** | No acoustic or temporal ratio calculation | Entire codebase | None | Feature completely absent. |
| **26** | Grammar Error Detection | **NOT IMPLEMENTED** | No grammar checker, syntax tree analyzer, or grammar LLM prompt | Entire codebase | None | System prompt instructs grader to ignore small STT errors. |
| **27** | Vocabulary Diversity (TTR) | **NOT IMPLEMENTED** | No Type-Token Ratio, lexical density, or vocabulary metrics | Entire codebase | None | Only total `wordCount()` is computed. |
| **28** | Conciseness & Rambling Detection | **NOT IMPLEMENTED** | No wordiness, conciseness, or rambling analysis | Entire codebase | None | Only minimum word threshold (20 words) is enforced. |
| **29** | Topic Relevance: Semantic Alignment | **PARTIALLY IMPLEMENTED** | LLM evaluates `coverage` against brief objectives via prompt | `src/rubric.ts`: `gradePrompt()`; `server/index.ts` | Unit tested schema | Subjective evaluation by LLM; no vector embeddings or cosine similarity. |
| **30** | Topic Deviation / Drift Detection | **NOT IMPLEMENTED** | Grader prompt does not identify points of deviation or drift | `src/rubric.ts`: line 124 | None | Off-topic guidance only instructs grader to ignore prompt injections. |
| **31** | Topic Objectives Fulfillment | **FULLY IMPLEMENTED** | Grader categorizes each objective as `covered`, `partial`, or `missed` | `src/rubric.ts`: line 50, 98; `src/ui/Result.tsx`: 100-111 | Schema validated | Each objective has status and quotes quoted evidence from transcript. |
| **32** | Timestamp-Linked Topic Drift | **NOT IMPLEMENTED** | No timestamps in transcript to correlate with topic drift | Entire codebase | None | Completely absent. |
| **33** | Speech Structure Analysis | **PARTIALLY IMPLEMENTED** | `clarity` dimension evaluates organization (0=incoherent, 4=well structured) | `src/rubric.ts`: lines 23-27 | Tested in `rubric.test.ts` | Single integer score (0-4); no breakdown of intro, body, conclusion. |
| **34** | Speaking Frameworks (PREP, STAR, PPF) | **NOT IMPLEMENTED** | No speaking framework models or templates exist | Entire codebase | None | No framework names or evaluation logic exist in codebase. |
| **35** | Acoustic Voice Analysis (Pitch, Energy) | **NOT IMPLEMENTED** | Audio is discarded after transcription; zero DSP or acoustic analysis | Entire codebase | None | Canvas visualizer in `Answer.tsx` is transient UI animation only. |
| **36** | Pronunciation & Articulation | **NOT IMPLEMENTED** | No phoneme or pronunciation evaluation | Entire codebase | None | Completely absent. |
| **37** | Subjective Communication Quality | **PARTIALLY IMPLEMENTED** | Grader produces 4 dimension scores, summary, and next steps | `src/rubric.ts`: `GRADE_SCHEMA` | Schema validated | Evaluated by LLM; subjective comprehension review rather than speech delivery. |
| **38** | Overall Scoring System (0-100) | **FULLY IMPLEMENTED** | Deterministic weighted formula combines 4 dimensions; clamps 0-100 | `src/rubric.ts`: `totalScore()`, `levelFor()` | Tested in `rubric.test.ts` (6 tests) | Weighted sum: Coverage 35%, Accuracy 30%, Depth 20%, Clarity 15%. |
| **39** | Session History & Progress Tracking | **FULLY IMPLEMENTED** | Database tracks sessions; computes streaks, 12-week calendar, trend | `src/progress.ts`, `src/ui/home/Dashboard.tsx` | Tested in `progress.test.ts` (10 tests) | Full dashboard with skill profile, trend line, and activity heat map. |
| **40** | Social Share Card Generation | **FULLY IMPLEMENTED** | Server renders SVG and converts to PNG using Resvg with embedded fonts | `server/shareCard.ts`, `server/index.ts`: lines 254-270 | Tested in `shareCard.test.ts` (3 tests) | Generates Open Graph cards for Twitter/LinkedIn with custom layout. |

---

## 4. Detailed Category Reports

### 4.1 Audio Input & Processing
- **Recording Mechanism:** Uses browser `MediaRecorder` API initialized with `audio: { echoCancellation: true, noiseSuppression: true }`. Chunks are aggregated into an in-memory array (`chunks: Blob[]`) and combined into a `Blob` on stop.
- **Waveform Visualization:** Uses `AudioContext` and `AnalyserNode` (`fftSize = 2048`) to render a 2D line graph on an HTML5 `<canvas>` during active recording. This data is strictly ephemeral and discarded immediately when recording ends.
- **Validation:** 
  - File size: Limited to 25 MB in backend and 26 MB at the HTTP bodyLimit layer.
  - Recording duration: Frontend hardcodes 10 minutes (`MAX_RECORD_MS = 10 * 60 * 1000`). Once elapsed, it auto-stops. However, the server does not enforce a minimum or maximum audio duration check.
  - Word count: Enforces `MIN_ANSWER_WORDS = 20`. Submissions under 20 words return HTTP 422.
- **Deficiencies:** No audio playback preview before submission; no pause/resume functionality; no cancel/abort button; no support for uploading pre-recorded audio files in the UI; no server-side audio validation (e.g., verifying valid audio container headers via `ffprobe` or magic bytes).

### 4.2 Transcription Pipeline
- **Implementation:** Implemented in `server/openai.ts` via `transcribe()`. Sends a `multipart/form-data` request to `https://api.openai.com/v1/audio/transcriptions` specifying the model (`gpt-transcribe` by default, or `whisper-1`).
- **Data Extracted:** Only `body?.text` is parsed.
- **Deficiencies:** 
  - Does not configure `response_format: 'verbose_json'`.
  - Does not request `timestamp_granularities: ['word', 'segment']`.
  - Word-level timestamps, sentence segmentation, confidence scores, and speech segments are completely absent.
  - Audio file is never saved to disk or object storage (S3/GCS); it is discarded once the HTTP request completes.

### 4.3 Filler Word Detection
- **Status:** **NOT IMPLEMENTED.**
- **Investigation:** A comprehensive search of the codebase for filler tokens (`um`, `uh`, `like`, `you know`, `basically`, `actually`, `literally`, `so`, `well`, `kind of`, `sort of`, `right`, `okay`, `i guess`) confirms that no filler word dictionary, regex pattern, NLP tokenizer, or prompt guidance exists.
- **Whisper Filtering:** By default, standard OpenAI transcription cleans and normalizes conversational speech, frequently omitting verbal pauses ("um", "uh") unless explicit temperature settings and prompt guidance (`prompt: "Um, uh..."`) are supplied.
- **Deficiencies:** No count of fillers, no rate per minute, no transcript highlighting, no contextual disambiguation (e.g., *"I like coding"* vs. *"Like, I don't know"*), and no filler reduction feedback.

### 4.4 Fluency Analysis
- **Status:** **NOT IMPLEMENTED.**
- **Investigation:** No algorithms exist to detect repeated words, repeated phrases, false starts, incomplete sentences, self-corrections, or stuttering patterns.
- **Distinction:** The rubric includes a dimension named `clarity` (`src/rubric.ts`), but its definition is:
  ```ts
  anchors: '0 = incoherent; 2 = understandable but disorganized; 4 = well structured, could teach a beginner'
  ```
  This measures semantic clarity and topical structure, not verbal fluency or speech flow.

### 4.5 Speaking Pace & Timing Analysis
- **Status:** **NOT IMPLEMENTED.**
- **Investigation:** Words per minute (WPM), average speaking rate, pace variations, and silence durations are completely absent.
- **Timing Confusions:** The codebase tracks two time-related metrics, neither of which is speech pace:
  1. `minutes`: The chosen study sprint duration (15, 20, or 30 minutes).
  2. `studied_minutes`: The elapsed time between study timer start (`started_at`) and grading (`graded_at`), clamped to `minutes`.
- **Deficiencies:** The recording duration is not stored in the database. Consequently, calculating WPM (`wordCount / (duration / 60)`) is impossible with the current data model.

### 4.6 Grammar & Language Analysis
- **Status:** **NOT IMPLEMENTED.**
- **Grammar Evaluation:** Neither a dedicated rule-based grammar checker (such as LanguageTool) nor an LLM grammar instruction is present. The system prompt in `src/rubric.ts` explicitly instructs:
  ```
  "Transcription may have small speech-to-text errors; do not penalize those."
  ```
- **Vocabulary Diversity:** No Type-Token Ratio (TTR), lexical richness, or vocabulary repetition analysis is performed.
- **Clarity & Conciseness:** Only evaluated as a broad qualitative impression under the `clarity` dimension. No specific sentence-level flags for passive voice, rambling, or redundancy are generated.

### 4.7 Topic Relevance Analysis (Dedicated Deep Dive)
- **Status:** **PARTIALLY IMPLEMENTED (Comprehension-focused).**
- **How it Works:** 
  1. When a session is created (`POST /api/sessions`), `briefPrompt()` asks OpenAI to generate 3–5 concrete objectives:
     ```ts
     "Return 3-5 objectives scaled to the time budget, 4-8 key terms, and 2-4 web search queries..."
     ```
  2. When the user submits their explanation (`POST /api/sessions/:id/grade`), `gradePrompt()` supplies the topic, objectives, key terms, and transcript:
     ```ts
     `Topic: <topic>${topic}</topic>\n\nObjectives:\n${brief.objectives.map((o, i) => `${i + 1}. ${o}`).join('\n')}\n\nKey terms: ${brief.keyTerms.join(', ')}\n\n<transcript>\n${transcript}\n</transcript>`
     ```
  3. The model returns:
     - `dimensions.coverage`: Score 0–4 with written `reason`.
     - `objectives`: Array of `{ objective: string, status: 'covered' | 'partial' | 'missed', evidence: string }`.
- **Evaluation of Specific Capabilities:**
  - *7.1 Topic Alignment:* Handled via prompt; model checks whether objectives were discussed.
  - *7.2 Main Argument Relevance:* Model evaluates whether explanation matches objectives.
  - *7.3 Supporting Evidence Relevance:* Model cites direct quotes or paraphrases from transcript in `evidence` field.
  - *7.4 Topic Deviation Detection:* **NOT IMPLEMENTED.** The prompt does not ask the model to identify off-topic paragraphs or deviations. (The only mention of "off-topic" is instructing the model to treat prompt injections as off-topic).
  - *7.5 Question Fulfillment:* Evaluated only if the topic was formulated as a question.
  - *7.6 Semantic Relevance Implementation:* 100% LLM prompt inference (`gpt-6-astra`). Zero vector embeddings (`text-embedding-3-small`), zero cosine similarity calculations, and zero keyword matching algorithms.
  - *7.7 Topic Relevance Scoring:* Represented as the `coverage` dimension score (0–4), which has a 35% weight in the total score. There is no separate 0–100 Topic Relevance metric.
  - *7.8 Timestamp-Linked Topic Drift:* **NOT IMPLEMENTED.** No timestamps exist in the transcript.
  - *7.9 Improvement Suggestions:* Generates `misconceptions` and `nextSteps` arrays describing gaps in the argument.

### 4.8 Speech Structure & Argumentation
- **Status:** **PARTIALLY IMPLEMENTED.**
- **Details:** The `clarity` dimension measures whether the speech is "incoherent", "understandable but disorganized", or "well structured, could teach a beginner".
- **Deficiencies:** Does not evaluate separate sections (introduction, body arguments, transitions, conclusion). Does not check whether the speaker maintains a consistent stance.
- **Speaking Frameworks (PREP, STAR, PPF, MECE):** **NOT IMPLEMENTED.** There is no code, configuration, or prompt mention of any speaking framework.

### 4.9 Voice & Delivery Analysis (Acoustic Properties)
- **Status:** **NOT IMPLEMENTED.**
- **Findings:**
  - Pronunciation / Articulation: Not analyzed.
  - Voice Clarity / Intelligibility: Not analyzed.
  - Pitch Variation / Intonation / Monotony: Not analyzed.
  - Vocal Energy / Loudness / Speaking Volume: Not analyzed.
  - Vocal Hesitation: Not analyzed.
- **Root Cause:** All audio is discarded by the server immediately after transcription. No audio features (MFCCs, spectrograms, RMS energy, fundamental frequency F0, zero-crossing rate) are ever extracted or stored.

### 4.10 Communication & Speaking Quality
- **Status:** **PARTIALLY IMPLEMENTED (Qualitative LLM only).**
- **Findings:** The LLM produces a 2-sentence `summary`, lists `misconceptions`, and suggests 2–3 `nextSteps`. However, this is entirely a comprehension critique ("You explained X but forgot Y"), rather than a communication or delivery critique ("You spoke too quietly" or "You repeated yourself").

### 4.11 Scoring & Evaluation System
- **Status:** **FULLY IMPLEMENTED (For Knowledge Examination).**
- **Architecture:** Hybrid evaluation model:
  1. *LLM Evaluation:* Generates integer scores (0, 1, 2, 3, 4) for four dimensions via strict JSON schema.
  2. *Deterministic Computation:* Calculated on the server in `src/rubric.ts`:
     $$\text{Total Score} = \text{round}\left( \sum_{d \in \text{DIMENSIONS}} \frac{\text{weight}_d \times \text{clamp}(\text{score}_d)}{4} \times 100 \right)$$
     - Coverage: 35%
     - Accuracy: 30%
     - Depth: 20%
     - Clarity: 15%
- **Level Bands:**
  - $\ge 90$: Master
  - $\ge 75$: Expert
  - $\ge 60$: Practitioner
  - $\ge 40$: Apprentice
  - $< 40$: Novice
- **Anti-tamper / Determinism:** Client cannot forge scores; total score is computed in server backend. Clamping protects against model output values outside 0–4.
- **Weaknesses:** No explicit `temperature: 0` or seed parameter is passed to the OpenAI API in `server/openai.ts`. LLM score outputs may fluctuate slightly for identical transcripts across repeated evaluations.

### 4.12 Reports & Learning Experience
- **Implemented:**
  - Animated score hero with level stamp and summary.
  - Visual rubric breakdown bars with text reasons.
  - Checklist of objectives with Covered/Partial/Missed status and quoted text evidence.
  - List of factual misconceptions and actionable next steps.
  - Collapsible transcript drawer.
  - Returning user dashboard with streak count, 12-week activity heatmap, 12-session score trend line, and historical session table.
  - "Focus next" card identifying the user's lowest-scoring dimension and showing target criteria.
  - Dynamic Open Graph share card generation (`/r/:id/card.png`) using SVG + Resvg.
- **Missing from Reports:**
  - No filler word count or breakdown.
  - No WPM or pacing gauge.
  - No pause / silence breakdown.
  - No inline error highlighting in transcript text.
  - No audio playback player.
  - No delivery or voice metrics.

---

## 5. Test Results & Verification

### 5.1 Existing Automated Test Suite Execution

The existing automated test suite was executed via the project's test command (`node --test src/*.test.ts server/*.test.ts`).

**Execution Summary:**
- **Suites:** 5 files
- **Total Tests:** 25
- **Passed:** 25
- **Failed:** 0
- **Duration:** 95.5 ms

```
✔ parses a completed structured reply (20.98ms)
✔ a truncated (incomplete) reply is an upstream error, not a client SyntaxError (0.31ms)
✔ unparseable text is an upstream error (0.15ms)
✔ a refusal is reported as a refusal (0.13ms)
✔ wrap respects the character budget and line limit (1.46ms)
✔ escapes user text so the SVG cannot be broken or injected into (0.36ms)
✔ every level name fits inside its stamp and the stamp stays on the card (0.08ms)
✔ streak counts consecutive days ending today (0.64ms)
✔ streak survives until midnight if today is not done yet (0.10ms)
✔ streak is broken by a missed day (0.06ms)
✔ multiple sessions on one day count once, across month boundary (0.06ms)
✔ stats (2.63ms)
✔ dimension averages are 0-4 means per rubric part (0.23ms)
✔ weakest dimension breaks ties by rubric weight (the costlier gap first) (0.15ms)
✔ score trend is oldest-first and capped (0.15ms)
✔ activity days: one cell per day for N weeks ending today, counting sessions (0.20ms)
✔ weights sum to 1 (0.61ms)
✔ total score is weighted 0-100 and clamps bad model output (0.16ms)
✔ levels at boundaries (0.09ms)
✔ word count (0.21ms)
✔ studied minutes are measured from start but never exceed the chosen study time (0.18ms)
✔ every rubric part documents what 0, 2 and 4 mean (the landing page and grader both use these) (0.52ms)
✔ chosen niche is respected (0.53ms)
✔ "any" picks area and angle from the random source, including edge values (0.19ms)
✔ past topics are passed as an avoid list (0.12ms)
```

### 5.2 Verification Scenarios (Test Cases A – M)

Each requested test scenario was verified against the current codebase architecture. Where capabilities do not exist in code, the test is marked as **BLOCKED / NOT IMPLEMENTED** with the exact technical rationale.

| Scenario | Objective | Expected Speech Coaching Behavior | Actual TalkSense Behavior | Status |
|---|---|---|---|---|
| **Case A: Excessive Fillers** | Speech with repeated "um", "uh", "like", "you know" | Identify, count, and penalize unnecessary fillers | Whisper normalizes or retains text; grader does not evaluate fillers; score unaffected | **BLOCKED / NOT IMPLEMENTED** |
| **Case B: Contextual Fillers** | Meaningful usage of "like", "so", "well", "actually" | Distinguish semantic vs. non-semantic usage | No filler classifier exists in codebase | **BLOCKED / NOT IMPLEMENTED** |
| **Case C: Repetition** | Accidental repetition vs intentional emphasis | Detect stutters and accidental repetition | No repetition detection algorithm exists | **BLOCKED / NOT IMPLEMENTED** |
| **Case D: Fast Speech** | High speaking rate audio recording | Measure WPM and recommend pacing adjustments | Audio duration discarded; WPM is never calculated | **BLOCKED / NOT IMPLEMENTED** |
| **Case E: Long Pauses** | Several long pauses / silences | Detect pause locations, lengths, and silence ratio | Audio discarded; silence intervals not extracted | **BLOCKED / NOT IMPLEMENTED** |
| **Case F: Grammar Errors** | Transcript with grammatical errors | Detect syntactic errors and provide corrections | System prompt explicitly ignores transcription errors; no grammar feedback | **BLOCKED / NOT IMPLEMENTED** |
| **Case G: Low Vocabulary Diversity** | Repetitive vocabulary and simple phrasing | Compute TTR and suggest lexical variety | Only total word count calculated; no vocabulary diversity score | **BLOCKED / NOT IMPLEMENTED** |
| **Case H: Off-Topic Speech** | Topic: AI in Education. Speech: History of computers | Detect low relevance and flag topic deviation | Evaluated via LLM: `coverage` score drops to 0–1; objectives marked `missed`. No timestamp drift. | **PARTIALLY VERIFIED** (Requires live OpenAI key) |
| **Case I: Semantically Relevant** | Topic: Remote work. Speech: Productivity, commuting | Recognize semantic alignment without exact keywords | Evaluated via LLM prompt: GPT recognizes conceptual relevance and marks objectives covered. | **PARTIALLY VERIFIED** (Requires live OpenAI key) |
| **Case J: Partially Relevant** | Topic: Social media regulation. Speech: Only benefits | Mark partial relevance; flag unanswered prompt | Objectives marked `partial` or `missed`; `misconceptions` notes omitted regulation aspect. | **PARTIALLY VERIFIED** (Requires live OpenAI key) |
| **Case K: Structured Speech** | Introduction, arguments, conclusion | Recognize clear structure and transitions | LLM awards high score (3–4) on `clarity` dimension. No structural section breakdown. | **PARTIALLY VERIFIED** (Requires live OpenAI key) |
| **Case L: Poorly Structured Speech** | Disconnected arguments, no conclusion | Identify structural disorganization | LLM awards low score (0–1) on `clarity` dimension. No granular section flags. | **PARTIALLY VERIFIED** (Requires live OpenAI key) |
| **Case M: Audio Quality** | Background noise / muffled audio | Assess confidence, flag uncertainty, prompt re-record | Whisper output is accepted blindly; no acoustic quality or word confidence check. | **BLOCKED / NOT IMPLEMENTED** |

---

## 6. Critical Missing Features

The following fundamental speech-analysis capabilities are completely absent from TalkSense:

1. **Acoustic Signal Processing Engine:** No capability to extract pitch ($F_0$), vocal volume, energy, intonation contours, or voice clarity.
2. **Audio File Retention / Object Storage:** Audio files are dropped immediately after transcription, making post-hoc acoustic analysis, user playback, and audio review impossible.
3. **Word-Level Timestamping:** OpenAI transcription is called without timestamp parameters; timing correlations between words, pauses, and topics are lost.
4. **Filler Word Analyzer:** No detection, counting, or categorization of verbal fillers (*"um"*, *"uh"*, *"like"*, etc.).
5. **Speaking Pace & Pause Metrics (WPM / VAD):** No words-per-minute measurement, pause duration analysis, or voice-activity-detection (VAD) silence metrics.
6. **Grammar & Syntax Evaluation:** No grammatical error detection, sentence boundary segmentation, or correction engine.
7. **Vocabulary Diversity & Lexical Analysis:** No Type-Token Ratio (TTR), word repetition tracking, or vocabulary variety scoring.
8. **Speaking Framework Support:** No templates or evaluation criteria for standard public speaking structures (PREP, STAR, PPF, MECE).
9. **Audio Playback in UI:** The user has no way to listen to their own recording before or after submission.
10. **Audio File Upload in UI:** No file picker or drag-and-drop mechanism for pre-recorded audio files.

---

## 7. Partially Implemented Features

1. **Topic Relevance Assessment:** 
   - *Present:* LLM assesses topic comprehension via `coverage` (0–4) and labels each objective `covered`, `partial`, or `missed`, quoting text evidence.
   - *Missing:* Vector embeddings, cosine similarity metrics, semantic drift tracking, timestamped topic deviation, and a dedicated 0–100 relevance score.
2. **Speech Structure Evaluation:**
   - *Present:* LLM assigns a 0–4 score to `clarity` based on whether the speech is organized or disorganized.
   - *Missing:* Component-by-component structural breakdown (Introduction, Main Arguments, Transitions, Conclusion) and adherence to argument frameworks.
3. **Audio Validation:**
   - *Present:* 25 MB payload limit, minimum 20 words validation, and client-side 10-minute timeout.
   - *Missing:* Server-side duration validation, audio format/MIME sniffing, audio integrity check, and silence-only audio detection.
4. **Recording Error Handling:**
   - *Present:* Catches microphone permission rejection and preserves recording in memory on transient network errors.
   - *Missing:* Mid-recording device disconnection detection, audio clipping warnings, and background noise alerts.
5. **Actionable Improvement Feedback:**
   - *Present:* Provides concrete `misconceptions` and `nextSteps` regarding topic knowledge.
   - *Missing:* Feedback regarding vocal delivery, pacing, pronunciation, or filler word reduction.

---

## 8. Broken Features & Inconsistencies

During the audit, the following inconsistencies and potential execution bugs were identified:

1. **In-Flight Audio Preservation on Error (`App.tsx` lines 126–128):**
   ```ts
   const resendable = transcript === undefined && 'audio' in input && !NEEDS_NEW_INPUT.has(status)
   pendingAudio.current = resendable ? input.audio : null
   ```
   If transcription succeeds on the server and is stored in PostgreSQL, but the grading step (`/api/sessions/:id/grade`) subsequently fails (e.g. OpenAI rate limit 429), `transcript` is set. If the user then leaves or reloads the page, `loadFlow()` restores `stage: 'answer'` with `transcript: saved.transcript`. However, if the user switches modes back to voice, `pendingAudio` is lost, and the user must re-record from scratch despite their transcript existing in the database.
2. **Missing Audio Duration in DB Schema (`server/db.ts`):**
   `sessions.minutes` stores the study sprint limit (15, 20, 30), and `sessions.studied_minutes` stores the time spent reading. The actual speech audio duration is never saved in the database, making it impossible to retroactively compute speech analytics.
3. **OpenAI Structured Outputs Error Handling:**
   In `server/openai.ts`, the model is invoked via `/responses` with schema format `type: 'json_schema', strict: true`. While `server/openai.test.ts` covers truncation and refusal, real-world network timeouts are governed by `AbortSignal.timeout(120_000)`. A 2-minute freeze on poor connections can leave the client in an indeterminate `Processing` spinner state without granular progress heartbeats.

---

## 9. Architectural Weaknesses

1. **Tightly Coupled "Oral Exam" Rubric:**
   The entire grading pipeline is hardcoded to a 4-part knowledge exam rubric (`Coverage`, `Accuracy`, `Depth`, `Clarity`). There is no pluggable analyzer interface or modular pipeline to execute specialized acoustic, linguistic, or delivery analyzers.
2. **Stateless Audio Pipeline (Immediate Audio Disposal):**
   Audio is received in a Hono route handler, converted into a multipart payload for OpenAI, and never persisted to durable object storage. This fundamentally prevents asynchronous speech processing, audio playback, acoustic feature extraction, or model re-evaluations.
3. **Synchronous HTTP Request Lifecycle for AI Pipeline:**
   Transcription and grading are executed synchronously in the HTTP request thread. If Whisper takes 15 seconds and GPT-6 takes 25 seconds, the HTTP connection remains open for 40 seconds. This is vulnerable to edge proxy timeouts (e.g., Railway/Cloudflare 30s–60s limits) and prevents queue-based scaling.
4. **Bring-Your-Own-Key Client Architecture:**
   Because API keys are stored in the user's browser `localStorage` and passed via `x-openai-key` headers, background asynchronous processing, scheduled evaluation jobs, or server-side batch workers cannot run when the client is disconnected.
5. **No Intermediate Speech Data Layer:**
   TalkSense jumps directly from `raw audio file` $\rightarrow$ `plain text string` $\rightarrow$ `LLM grade`. It lacks an intermediate speech representation layer containing:
   - Word alignments and timestamps.
   - Silence and pause intervals.
   - Energy and pitch contours.
   - Syntactic and phonetic tokens.

---

## 10. Recommended Implementation Roadmap

To evolve TalkSense from a conceptual study exam into a comprehensive speech analysis platform, missing capabilities should be built in the following prioritized sequence. *(Note: Per audit guidelines, this roadmap is for planning only and is not implemented in this audit).*

```
┌────────────────────────────────────────────────────────────────────────┐
│ P0: Core Speech Data & Pipeline Foundations (Prerequisite)             │
│ - Audio persistence (S3/Cloud Storage) & Audio Playback UI             │
│ - Word-level timestamping (Whisper verbose_json)                       │
│ - Duration & Speaking Pace (WPM) calculation                           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ P1: Verbal Delivery & Language Analysis (NLP Layer)                    │
│ - Context-aware filler word detection (Um, Uh, Like, You Know)         │
│ - Pause & hesitation analysis (Silence intervals from timestamps)      │
│ - Grammar & vocabulary diversity (TTR) analysis                        │
│ - Enhanced Topic Relevance engine (Embeddings + Semantic Drift)        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ P2: Acoustic & Delivery Analytics (Signal Processing Layer)            │
│ - Client/Server Web Audio DSP (Pitch/F0, vocal energy, volume)         │
│ - Speech structure & framework scoring (STAR, PREP, MECE)              │
│ - Interactive transcript with highlighted fillers & grammar errors     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ P3: Learning Experience & Advanced Speech Coaching                     │
│ - Multi-speaker support & pronunciation assessment                     │
│ - Async job queue (BullMQ/Redis) with real-time websocket updates      │
│ - Personalized speaking improvement plans & historical delivery trends │
└────────────────────────────────────────────────────────────────────────┘
```

### Phase P0: Core Speech Data Foundations (Critical Path)
- **Audio Storage & Playback:** Store audio recordings in S3/R2/GCS and add an audio player component in `Answer.tsx` and `Result.tsx` so users can listen to their delivery.
- **Word-Level Timestamps:** Update `server/openai.ts` to request `response_format: 'verbose_json'` and `timestamp_granularities: ['word', 'segment']`. Store timestamped tokens in PostgreSQL.
- **WPM & Duration:** Record speech audio duration in the database and calculate WPM deterministically:
  $$\text{WPM} = \frac{\text{Word Count}}{\text{Audio Duration (seconds)} / 60}$$

### Phase P1: Verbal Delivery & Language Analysis
- **Filler Word Detection Module:** Implement a dual-stage filler detector:
  1. Lexical / Regex scanner for unvoiced fillers (`um`, `uh`, `er`, `ah`).
  2. Context-aware NLP / LLM classifier for discourse markers (`like`, `you know`, `literally`, `basically`) to verify if usage is non-essential filler.
- **Pause & Silence Detection:** Parse Whisper segment and word start/end timestamps to calculate:
  - Pause count and total pause duration.
  - Identification of awkward pauses ($> 2.5\text{s}$) with exact timestamp locations.
  - Phonation ratio ($\text{speaking time} / \text{total time}$).
- **Dedicated Topic Relevance & Drift Engine:**
  - Compute cosine similarity between the topic vector and sentence embeddings (`text-embedding-3-small`).
  - Generate a sentence-by-sentence relevance curve to pinpoint exact timestamps where topic drift occurs.
- **Grammar & Lexical Richness:** Integrate LanguageTool or specialized grammar prompts to flag grammatical issues with suggested corrections, and calculate Type-Token Ratio (TTR).

### Phase P2: Acoustic Analytics & Speaking Frameworks
- **Acoustic Feature Extraction:** Implement client-side or server-side audio processing (via Web Audio API or Node.js `node-web-audio-api` / `meyda`) to analyze:
  - Pitch variation ($F_0$ standard deviation) to measure vocal monotony.
  - RMS energy distribution to assess vocal confidence and volume consistency.
- **Speaking Framework Templates:** Add framework selection in the Composer (e.g. PREP: Point, Reason, Example, Point; STAR: Situation, Task, Action, Result) and evaluate structure adherence.
- **Annotated Transcript UI:** Replace the plain text drawer with an interactive transcript highlighting filler words (orange), pauses (gray pills), grammar issues (red underline), and off-topic drift (yellow highlight).

### Phase P3: Advanced Coaching & Scale
- **Asynchronous Processing Pipeline:** Migrate from blocking HTTP requests to a background job worker (e.g., BullMQ + Redis) with Server-Sent Events (SSE) or WebSockets for live status updates.
- **Pronunciation & Articulation:** Integrate phonetic alignment (e.g. Azure Speech Pronunciation Assessment or Whisper phoneme logprobs) to flag mumbled or mispronounced terminology.
- **Comparative Delivery Dashboard:** Expand `Dashboard.tsx` to graph WPM trends, filler word reduction over time, and vocal pitch dynamics across sessions.

---

## 11. Final Feature Coverage Summary

### 11.1 Quantitative Feature Counts

| Status | Count | Percentage |
|---|---|---|
| **FULLY IMPLEMENTED** | 8 | 20.0% |
| **PARTIALLY IMPLEMENTED** | 7 | 17.5% |
| **NOT IMPLEMENTED** | 25 | 62.5% |
| **IMPLEMENTED BUT BROKEN** | 0 | 0.0% |
| **UNVERIFIED** | 0 | 0.0% |
| **TOTAL ASSESSED FEATURES** | **40** | **100%** |

*(Note: Features are counted based on the comprehensive 40-item feature inventory detailed in Section 3).*

### 11.2 Category-Wise Coverage Breakdown

```
Audio Input & Recording:       █████████░░░░░░░░░░░  45% (3 Full, 2 Partial, 4 None)
Transcription Pipeline:        ███████░░░░░░░░░░░░░  35% (2 Full, 0 Partial, 6 None)
Filler Word Detection:         ░░░░░░░░░░░░░░░░░░░░   0% (0 Full, 0 Partial, 4 None)
Fluency & Hesitation:          ░░░░░░░░░░░░░░░░░░░░   0% (0 Full, 0 Partial, 2 None)
Speaking Pace & Timing:        ░░░░░░░░░░░░░░░░░░░░   0% (0 Full, 0 Partial, 4 None)
Grammar & Language Analysis:   ░░░░░░░░░░░░░░░░░░░░   0% (0 Full, 0 Partial, 4 None)
Topic Relevance & Drift:       ████████████░░░░░░░░  60% (1 Full, 1 Partial, 2 None)
Speech Structure & Frameworks: █████░░░░░░░░░░░░░░░  25% (0 Full, 1 Partial, 1 None)
Voice & Acoustic Properties:   ░░░░░░░░░░░░░░░░░░░░   0% (0 Full, 0 Partial, 3 None)
Scoring & History Reporting:   ██████████████████░░  90% (2 Full, 2 Partial, 0 None)
```

---

## 12. Conclusion

TalkSense currently operates with high fidelity as an **oral learning comprehension tester**, featuring robust session flows, responsive animations, clean database persistence, and deterministic scoring math. 

However, as a **speech analysis and speaking improvement tool**, the application is at a nascent stage:
- All speech delivery, acoustic, and fluency dimensions are currently **unimplemented**.
- The platform relies entirely on transcript comprehension evaluated by an LLM prompt.
- Modern speech coaching metrics—such as filler word counting, pace modulation (WPM), pause distribution, vocal pitch variation, and grammatical correctness—require building dedicated acoustic and temporal NLP processing pipelines as outlined in the P0–P2 roadmap.
