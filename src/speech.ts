import { z } from 'zod'

/**
 * Normalized representation of a single transcribed word with alignment.
 */
export const NormalizedWordSchema = z.object({
  text: z.string(),
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
  confidence: z.number().min(0).max(1).nullable().default(null),
  punctuatedText: z.string().optional(),
})
export type NormalizedWord = z.infer<typeof NormalizedWordSchema>

/**
 * Normalized transcription output across providers.
 */
export const NormalizedTranscriptSchema = z.object({
  text: z.string(),
  words: z.array(NormalizedWordSchema),
  language: z.string().default('en'),
  durationSeconds: z.number().nonnegative(),
  provider: z.string(),
})
export type NormalizedTranscript = z.infer<typeof NormalizedTranscriptSchema>

/**
 * Speaking pace metrics and segment tempo analysis.
 */
export const PaceSegmentSchema = z.object({
  startSecond: z.number().nonnegative(),
  endSecond: z.number().nonnegative(),
  wordsCount: z.number().int().nonnegative(),
  wpm: z.number().nonnegative(),
})
export type PaceSegment = z.infer<typeof PaceSegmentSchema>

export const SpeakingPaceMetricsSchema = z.object({
  overallWpm: z.number().nonnegative(),
  activeWpm: z.number().nonnegative(),
  totalDurationSeconds: z.number().nonnegative(),
  activeSpeakingDurationSeconds: z.number().nonnegative(),
  tempoStatus: z.enum(['VERY_SLOW', 'SLOW', 'MODERATE', 'FAST', 'VERY_FAST']),
  calculationMethod: z.string(),
  confidence: z.number().min(0).max(1),
  segments: z.array(PaceSegmentSchema),
  evidence: z.string(),
})
export type SpeakingPaceMetrics = z.infer<typeof SpeakingPaceMetricsSchema>

/**
 * Filler word classifications and detection events.
 */
export const FillerClassificationEnum = z.enum([
  'CONFIRMED_FILLER',
  'DISCOURSE_MARKER',
  'MEANINGFUL_USAGE',
  'UNCERTAIN',
])
export type FillerClassification = z.infer<typeof FillerClassificationEnum>

export const FillerOccurrenceSchema = z.object({
  id: z.string(),
  token: z.string(),
  canonical: z.string(),
  classification: FillerClassificationEnum,
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
  wordIndex: z.number().int().nonnegative(),
  surroundingContext: z.string(),
  detectionMethod: z.string(),
  confidence: z.number().min(0).max(1),
  reason: z.string(),
})
export type FillerOccurrence = z.infer<typeof FillerOccurrenceSchema>

export const FillerMetricsSchema = z.object({
  totalCount: z.number().int().nonnegative(),
  confirmedCount: z.number().int().nonnegative(),
  discourseMarkerCount: z.number().int().nonnegative(),
  fillersPer100Words: z.number().nonnegative(),
  occurrences: z.array(FillerOccurrenceSchema),
  frequencyByType: z.record(z.string(), z.number().int().nonnegative()),
  timelineDistribution: z.array(
    z.object({
      secondBucket: z.number().int().nonnegative(),
      count: z.number().int().nonnegative(),
    }),
  ),
})
export type FillerMetrics = z.infer<typeof FillerMetricsSchema>

/**
 * Pause and hesitation analysis.
 */
export const PauseCategoryEnum = z.enum([
  'NORMAL_ARTICULATION',
  'GRAMMATICAL_PAUSE',
  'HESITATION_PAUSE',
  'LONG_SILENCE',
])
export type PauseCategory = z.infer<typeof PauseCategoryEnum>

export const PauseEventSchema = z.object({
  id: z.string(),
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
  durationSeconds: z.number().nonnegative(),
  category: PauseCategoryEnum,
  previousWord: z.string().optional(),
  nextWord: z.string().optional(),
  wordIndexAfter: z.number().int().nonnegative(),
  context: z.string(),
})
export type PauseEvent = z.infer<typeof PauseEventSchema>

export const PauseMetricsSchema = z.object({
  totalPauses: z.number().int().nonnegative(),
  averagePauseDurationSeconds: z.number().nonnegative(),
  longestPauseSeconds: z.number().nonnegative(),
  totalPauseDurationSeconds: z.number().nonnegative(),
  pausesPerMinute: z.number().nonnegative(),
  silenceRatio: z.number().min(0).max(1),
  events: z.array(PauseEventSchema),
  distribution: z.object({
    shortCount: z.number().int().nonnegative(), // 0.25s - 0.5s
    moderateCount: z.number().int().nonnegative(), // 0.5s - 1.5s
    longCount: z.number().int().nonnegative(), // > 1.5s
  }),
})
export type PauseMetrics = z.infer<typeof PauseMetricsSchema>

/**
 * Repetition analysis (Lexical and Semantic).
 */
export const RepetitionTypeEnum = z.enum([
  'LEXICAL_CONSECUTIVE',
  'LEXICAL_RESTART',
  'LEXICAL_NEARBY',
  'SEMANTIC_REPETITION',
])
export type RepetitionType = z.infer<typeof RepetitionTypeEnum>

export const RepetitionEventSchema = z.object({
  id: z.string(),
  type: RepetitionTypeEnum,
  phrase: z.string(),
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
  startIndex: z.number().int().nonnegative(),
  endIndex: z.number().int().nonnegative(),
  confidence: z.number().min(0).max(1),
  reason: z.string(),
  isIntentionalEmphasis: z.boolean().default(false),
})
export type RepetitionEvent = z.infer<typeof RepetitionEventSchema>

export const RepetitionMetricsSchema = z.object({
  lexicalCount: z.number().int().nonnegative(),
  semanticCount: z.number().int().nonnegative(),
  totalCount: z.number().int().nonnegative(),
  events: z.array(RepetitionEventSchema),
})
export type RepetitionMetrics = z.infer<typeof RepetitionMetricsSchema>

/**
 * Grammar and Vocabulary Analysis.
 */
export const GrammarIssueCategoryEnum = z.enum([
  'SUBJECT_VERB_AGREEMENT',
  'TENSE_INCONSISTENCY',
  'ARTICLE_OR_PREPOSITION',
  'INCOMPLETE_SENTENCE',
  'WORD_ORDER_OR_SYNTAX',
  'WORD_CHOICE',
  'SPEECH_TO_TEXT_ARTIFACT',
])
export type GrammarIssueCategory = z.infer<typeof GrammarIssueCategoryEnum>

export const GrammarIssueSchema = z.object({
  id: z.string(),
  category: GrammarIssueCategoryEnum,
  originalText: z.string(),
  suggestedCorrection: z.string(),
  explanation: z.string(),
  startWordIndex: z.number().int().nonnegative(),
  endWordIndex: z.number().int().nonnegative(),
  confidence: z.number().min(0).max(1),
  isLikelyAsrArtifact: z.boolean().default(false),
})
export type GrammarIssue = z.infer<typeof GrammarIssueSchema>

export const VocabularyMetricsSchema = z.object({
  totalWords: z.number().int().nonnegative(),
  uniqueWords: z.number().int().nonnegative(),
  typeTokenRatio: z.number().min(0).max(1),
  movingAverageTTR: z.number().min(0).max(1),
  ttrWindowSize: z.number().int().positive(),
  repetitiveWords: z.array(z.object({ word: z.string(), count: z.number().int().positive() })),
  domainTerms: z.array(z.string()),
})
export type VocabularyMetrics = z.infer<typeof VocabularyMetricsSchema>

export const LanguageMetricsSchema = z.object({
  grammarIssues: z.array(GrammarIssueSchema),
  vocabulary: VocabularyMetricsSchema,
  clarityAssessment: z.string(),
})
export type LanguageMetrics = z.infer<typeof LanguageMetricsSchema>

/**
 * Acoustic Voice Analysis.
 */
export const AcousticMetricsSchema = z.object({
  status: z.enum(['MEASURED', 'DEGRADED', 'UNAVAILABLE']),
  meanF0Hz: z.number().nullable(),
  medianF0Hz: z.number().nullable(),
  f0StdDevHz: z.number().nullable(), // Monotony metric
  pitchMinHz: z.number().nullable(),
  pitchMaxHz: z.number().nullable(),
  pitchVariationStatus: z.enum(['MONOTONE', 'BALANCED', 'HIGH_VARIATION', 'UNAVAILABLE']),
  meanRmsEnergyDb: z.number().nullable(),
  energyDynamicRangeDb: z.number().nullable(),
  voicedFrameRatio: z.number().min(0).max(1).nullable(),
  sampleRateHz: z.number().int().positive().nullable(),
  channelCount: z.number().int().positive().nullable(),
  diagnosticMessage: z.string().optional(),
})
export type AcousticMetrics = z.infer<typeof AcousticMetricsSchema>

/**
 * Complete Aggregated Speech Intelligence Report.
 * Keeps speech delivery strictly separated from conceptual knowledge grading.
 */
export const SpeechReportSchema = z.object({
  version: z.literal('1.0.0'),
  sessionId: z.string(),
  recordingId: z.string().nullable(),
  analyzedAt: z.string(),
  transcript: NormalizedTranscriptSchema,
  pace: SpeakingPaceMetricsSchema,
  fillers: FillerMetricsSchema,
  pauses: PauseMetricsSchema,
  repetition: RepetitionMetricsSchema,
  language: LanguageMetricsSchema,
  acoustics: AcousticMetricsSchema,
  audioPlayableUrl: z.string().nullable(),
  limitations: z.array(z.string()),
})
export type SpeechReport = z.infer<typeof SpeechReportSchema>
