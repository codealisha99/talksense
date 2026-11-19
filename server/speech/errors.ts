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
  constructor(message: string, public readonly recordingId?: string) {
    super(message, 'AUDIO_STORAGE_ERROR')
  }
}

export class AudioFormatError extends SpeechAnalysisError {
  constructor(message: string, public readonly detectedMime?: string) {
    super(message, 'AUDIO_FORMAT_ERROR')
  }
}

export class TranscriptionAlignmentError extends SpeechAnalysisError {
  constructor(message: string, public readonly provider?: string) {
    super(message, 'TRANSCRIPTION_ALIGNMENT_ERROR')
  }
}

export class SpeechModuleError extends SpeechAnalysisError {
  constructor(
    public readonly moduleName: 'pace' | 'fillers' | 'pauses' | 'repetition' | 'language' | 'acoustics',
    message: string,
    public readonly originalError?: unknown,
  ) {
    super(`[Speech Module: ${moduleName}] ${message}`, `MODULE_${moduleName.toUpperCase()}_ERROR`)
  }
}
