import type {
  NormalizedTranscript,
  SpeechReport,
  SpeakingPaceMetrics,
  FillerMetrics,
  PauseMetrics,
  RepetitionMetrics,
  LanguageMetrics,
  AcousticMetrics,
} from '../../src/speech.ts'
import { SpeakingPaceEngine } from './pace/engine.ts'
import { FillerDetectionEngine } from './fillers/engine.ts'
import { PauseAnalysisEngine } from './pauses/engine.ts'
import { RepetitionDetectionEngine } from './repetition/engine.ts'
import { VocabularyAnalyzer } from './language/vocabulary.ts'
import { GrammarAnalyzer } from './language/grammar.ts'
import { AcousticAnalysisEngine } from './acoustics/engine.ts'
import { SpeechModuleError } from './errors.ts'

export type PipelineOptions = {
  sessionId: string
  recordingId?: string | null
  audioBuffer?: Buffer | Uint8Array
  audioPlayableUrl?: string | null
}

/**
 * Orchestrates the modular speech intelligence pipeline.
 * Runs analysis engines independently with graceful degradation.
 */
export class SpeechAnalysisPipeline {
  private readonly paceEngine: SpeakingPaceEngine
  private readonly fillerEngine: FillerDetectionEngine
  private readonly pauseEngine: PauseAnalysisEngine
  private readonly repetitionEngine: RepetitionDetectionEngine
  private readonly vocabularyAnalyzer: VocabularyAnalyzer
  private readonly grammarAnalyzer: GrammarAnalyzer
  private readonly acousticEngine: AcousticAnalysisEngine

  constructor() {
    this.paceEngine = new SpeakingPaceEngine()
    this.fillerEngine = new FillerDetectionEngine()
    this.pauseEngine = new PauseAnalysisEngine()
    this.repetitionEngine = new RepetitionDetectionEngine()
    this.vocabularyAnalyzer = new VocabularyAnalyzer()
    this.grammarAnalyzer = new GrammarAnalyzer()
    this.acousticEngine = new AcousticAnalysisEngine()
  }

  public async run(
    transcript: NormalizedTranscript,
    options: PipelineOptions,
  ): Promise<SpeechReport> {
    const limitations: string[] = []
    const words = transcript.words
    const duration = transcript.durationSeconds

    // 1. Speaking Pace
    let pace: SpeakingPaceMetrics
    try {
      pace = this.paceEngine.analyze(transcript, duration)
    } catch (err) {
      limitations.push(`Speaking pace calculation failed: ${err instanceof Error ? err.message : String(err)}`)
      pace = {
        overallWpm: 0,
        activeWpm: 0,
        totalDurationSeconds: duration,
        activeSpeakingDurationSeconds: 0,
        tempoStatus: 'MODERATE',
        calculationMethod: 'FALLBACK',
        confidence: 0,
        segments: [],
        evidence: 'Pace measurement degraded.',
      }
    }

    // 2. Filler Words
    let fillers: FillerMetrics
    try {
      fillers = this.fillerEngine.analyze(transcript)
    } catch (err) {
      limitations.push(`Filler detection degraded: ${err instanceof Error ? err.message : String(err)}`)
      fillers = {
        totalCount: 0,
        confirmedCount: 0,
        discourseMarkerCount: 0,
        fillersPer100Words: 0,
        occurrences: [],
        frequencyByType: {},
        timelineDistribution: [],
      }
    }

    // 3. Pauses and Hesitation
    let pauses: PauseMetrics
    try {
      pauses = this.pauseEngine.analyze(transcript, duration)
    } catch (err) {
      limitations.push(`Pause analysis degraded: ${err instanceof Error ? err.message : String(err)}`)
      pauses = {
        totalPauses: 0,
        averagePauseDurationSeconds: 0,
        longestPauseSeconds: 0,
        totalPauseDurationSeconds: 0,
        pausesPerMinute: 0,
        silenceRatio: 0,
        events: [],
        distribution: { shortCount: 0, moderateCount: 0, longCount: 0 },
      }
    }

    // 4. Repetition
    let repetition: RepetitionMetrics
    try {
      repetition = this.repetitionEngine.analyze(transcript)
    } catch (err) {
      limitations.push(`Repetition analysis degraded: ${err instanceof Error ? err.message : String(err)}`)
      repetition = {
        lexicalCount: 0,
        semanticCount: 0,
        totalCount: 0,
        events: [],
      }
    }

    // 5. Language (Vocabulary & Grammar)
    let language: LanguageMetrics
    try {
      const vocabulary = this.vocabularyAnalyzer.analyze(words)
      const grammarIssues = this.grammarAnalyzer.analyzeText(transcript.text, words)

      let clarityAssessment = 'Clear, concise sentence structures.'
      if (grammarIssues.length > 2) {
        clarityAssessment = `Identified ${grammarIssues.length} potential grammatical or phrasing improvements.`
      }

      language = {
        grammarIssues,
        vocabulary,
        clarityAssessment,
      }
    } catch (err) {
      limitations.push(`Language analysis degraded: ${err instanceof Error ? err.message : String(err)}`)
      language = {
        grammarIssues: [],
        vocabulary: {
          totalWords: words.length,
          uniqueWords: new Set(words.map((w) => (w.text || '').toLowerCase())).size,
          typeTokenRatio: 0,
          movingAverageTTR: 0,
          ttrWindowSize: 50,
          repetitiveWords: [],
          domainTerms: [],
        },
        clarityAssessment: 'Grammar analysis temporarily unavailable.',
      }
    }

    // 6. Acoustic Voice Characteristics
    let acoustics: AcousticMetrics
    try {
      acoustics = this.acousticEngine.analyze(options.audioBuffer)
      if (acoustics.status === 'DEGRADED') {
        limitations.push(acoustics.diagnosticMessage || 'Acoustic metrics degraded for this audio format.')
      }
    } catch (err) {
      limitations.push(`Acoustic signal processing failed: ${err instanceof Error ? err.message : String(err)}`)
      acoustics = {
        status: 'UNAVAILABLE',
        meanF0Hz: null,
        medianF0Hz: null,
        f0StdDevHz: null,
        pitchMinHz: null,
        pitchMaxHz: null,
        pitchVariationStatus: 'UNAVAILABLE',
        meanRmsEnergyDb: null,
        energyDynamicRangeDb: null,
        voicedFrameRatio: null,
        sampleRateHz: null,
        channelCount: null,
        diagnosticMessage: 'Signal processing unavailable.',
      }
    }

    return {
      version: '1.0.0',
      sessionId: options.sessionId,
      recordingId: options.recordingId ?? null,
      analyzedAt: new Date().toISOString(),
      transcript,
      pace,
      fillers,
      pauses,
      repetition,
      language,
      acoustics,
      audioPlayableUrl: options.audioPlayableUrl ?? null,
      limitations,
    }
  }
}
