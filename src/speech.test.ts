import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  NormalizedWordSchema,
  NormalizedTranscriptSchema,
  SpeakingPaceMetricsSchema,
  FillerMetricsSchema,
  PauseMetricsSchema,
  SpeechReportSchema,
  type SpeechReport,
} from './speech.ts'

test('NormalizedWordSchema validates valid words and rejects negative timestamps', () => {
  const valid = NormalizedWordSchema.parse({
    text: 'hello',
    start: 0.1,
    end: 0.45,
    confidence: 0.95,
  })
  assert.equal(valid.text, 'hello')
  assert.equal(valid.confidence, 0.95)

  assert.throws(() => {
    NormalizedWordSchema.parse({
      text: 'invalid',
      start: -1,
      end: 0.5,
    })
  })
})

test('NormalizedTranscriptSchema parses normalized transcript and preserves duration', () => {
  const transcript = NormalizedTranscriptSchema.parse({
    text: 'Hello world',
    words: [
      { text: 'Hello', start: 0.0, end: 0.4 },
      { text: 'world', start: 0.5, end: 0.9 },
    ],
    language: 'en',
    durationSeconds: 1.2,
    provider: 'openai-whisper',
  })
  assert.equal(transcript.words.length, 2)
  assert.equal(transcript.durationSeconds, 1.2)
})

test('SpeakingPaceMetricsSchema enforces tempo categorization and segment non-negativity', () => {
  const pace = SpeakingPaceMetricsSchema.parse({
    overallWpm: 142.5,
    activeWpm: 155.0,
    totalDurationSeconds: 60,
    activeSpeakingDurationSeconds: 55.2,
    tempoStatus: 'MODERATE',
    calculationMethod: 'WORD_TIMESTAMPS',
    confidence: 0.9,
    segments: [{ startSecond: 0, endSecond: 30, wordsCount: 75, wpm: 150 }],
    evidence: 'Measured 142.5 WPM across 60s recording.',
  })
  assert.equal(pace.tempoStatus, 'MODERATE')
  assert.equal(pace.segments.length, 1)
})

test('FillerMetricsSchema distinguishes confirmed fillers from discourse markers', () => {
  const fillers = FillerMetricsSchema.parse({
    totalCount: 2,
    confirmedCount: 1,
    discourseMarkerCount: 1,
    fillersPer100Words: 2.0,
    occurrences: [
      {
        id: 'f-1',
        token: 'um',
        canonical: 'um',
        classification: 'CONFIRMED_FILLER',
        start: 1.2,
        end: 1.5,
        wordIndex: 3,
        surroundingContext: 'I was um thinking',
        detectionMethod: 'ACOUSTIC_LEXICAL',
        confidence: 0.95,
        reason: 'Unvoiced hesitation token',
      },
      {
        id: 'f-2',
        token: 'like',
        canonical: 'like',
        classification: 'DISCOURSE_MARKER',
        start: 4.1,
        end: 4.3,
        wordIndex: 8,
        surroundingContext: 'It was like totally fine',
        detectionMethod: 'CONTEXTUAL_SYNTAX',
        confidence: 0.7,
        reason: 'Informal discourse marker before adverb',
      },
    ],
    frequencyByType: { um: 1, like: 1 },
    timelineDistribution: [{ secondBucket: 0, count: 1 }, { secondBucket: 4, count: 1 }],
  })
  assert.equal(fillers.confirmedCount, 1)
  assert.equal(fillers.discourseMarkerCount, 1)
})

test('SpeechReportSchema enforces complete modular structure and keeps report clean', () => {
  const report: SpeechReport = {
    version: '1.0.0',
    sessionId: '550e8400-e29b-41d4-a716-446655440000',
    recordingId: '660e8400-e29b-41d4-a716-446655440000',
    analyzedAt: new Date().toISOString(),
    transcript: {
      text: 'This is a test explanation.',
      words: [
        { text: 'This', start: 0, end: 0.3, confidence: null },
        { text: 'is', start: 0.35, end: 0.5, confidence: null },
        { text: 'a', start: 0.55, end: 0.65, confidence: null },
        { text: 'test', start: 0.7, end: 1.0, confidence: null },
        { text: 'explanation', start: 1.05, end: 1.8, confidence: null },
      ],
      language: 'en',
      durationSeconds: 2.0,
      provider: 'openai-whisper',
    },
    pace: {
      overallWpm: 150,
      activeWpm: 166.7,
      totalDurationSeconds: 2.0,
      activeSpeakingDurationSeconds: 1.8,
      tempoStatus: 'MODERATE',
      calculationMethod: 'WORD_TIMESTAMPS',
      confidence: 0.85,
      segments: [],
      evidence: 'Test pace sample',
    },
    fillers: {
      totalCount: 0,
      confirmedCount: 0,
      discourseMarkerCount: 0,
      fillersPer100Words: 0,
      occurrences: [],
      frequencyByType: {},
      timelineDistribution: [],
    },
    pauses: {
      totalPauses: 0,
      averagePauseDurationSeconds: 0,
      longestPauseSeconds: 0,
      totalPauseDurationSeconds: 0,
      pausesPerMinute: 0,
      silenceRatio: 0.1,
      events: [],
      distribution: { shortCount: 0, moderateCount: 0, longCount: 0 },
    },
    repetition: {
      lexicalCount: 0,
      semanticCount: 0,
      totalCount: 0,
      events: [],
    },
    language: {
      grammarIssues: [],
      vocabulary: {
        totalWords: 5,
        uniqueWords: 5,
        typeTokenRatio: 1.0,
        movingAverageTTR: 1.0,
        ttrWindowSize: 50,
        repetitiveWords: [],
        domainTerms: [],
      },
      clarityAssessment: 'Clear and concise test utterance.',
    },
    acoustics: {
      status: 'MEASURED',
      meanF0Hz: 135.2,
      medianF0Hz: 134.0,
      f0StdDevHz: 18.5,
      pitchMinHz: 98.0,
      pitchMaxHz: 182.0,
      pitchVariationStatus: 'BALANCED',
      meanRmsEnergyDb: -22.4,
      energyDynamicRangeDb: 18.2,
      voicedFrameRatio: 0.82,
      sampleRateHz: 16000,
      channelCount: 1,
    },
    audioPlayableUrl: '/api/recordings/660e8400-e29b-41d4-a716-446655440000',
    limitations: [],
  }

  const parsed = SpeechReportSchema.parse(report)
  assert.equal(parsed.version, '1.0.0')
  assert.equal(parsed.pace.overallWpm, 150)
  assert.equal(parsed.acoustics.status, 'MEASURED')
})
