/**
 * Error hierarchy for the TalkSense Speech Analysis Engine.
 * Enables graceful degradation so failures in optional modules do not abort the entire pipeline.
 */

export class SpeechAnalysisError extends Error {
  public readonly code: string
  public readonly isOperational: boolean

  constructor(message: string, code: string = 'SPEECH_ANALYSIS_ERROR', isOperational: boolean = true) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    this.isOperational = isOperational
  }
}

export class AudioStorageError extends SpeechAnalysisError {
  public readonly recordingId?: string

  constructor(message: string, recordingId?: string) {
    super(message, 'AUDIO_STORAGE_ERROR')
    this.recordingId = recordingId
  }
}

export class AudioFormatError extends SpeechAnalysisError {
  public readonly detectedMime?: string

  constructor(message: string, detectedMime?: string) {
    super(message, 'AUDIO_FORMAT_ERROR')
    this.detectedMime = detectedMime
  }
}

export class TranscriptionAlignmentError extends SpeechAnalysisError {
  public readonly provider?: string

  constructor(message: string, provider?: string) {
    super(message, 'TRANSCRIPTION_ALIGNMENT_ERROR')
    this.provider = provider
  }
}

export class SpeechModuleError extends SpeechAnalysisError {
  public readonly moduleName: 'pace' | 'fillers' | 'pauses' | 'repetition' | 'language' | 'acoustics'
  public readonly originalError?: unknown

  constructor(
    moduleName: 'pace' | 'fillers' | 'pauses' | 'repetition' | 'language' | 'acoustics',
    message: string,
    originalError?: unknown,
  ) {
    super(`[Speech Module: ${moduleName}] ${message}`, `MODULE_${moduleName.toUpperCase()}_ERROR`)
    this.moduleName = moduleName
    this.originalError = originalError
  }
}
