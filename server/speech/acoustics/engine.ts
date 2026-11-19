import type { AcousticMetrics } from '../../../src/speech.ts'
import { PcmAudioDecoder } from './pcmDecoder.ts'
import { AudioEnergyAnalyzer } from './energy.ts'
import { AutocorrelationPitchDetector } from './pitch.ts'
import { sniffAudioFormat } from '../audio/formatSniffer.ts'

/**
 * Acoustic voice characteristics engine.
 * Decodes raw audio samples and computes physical acoustic properties:
 * pitch (F0), vocal monotony, loudness dynamics, and voiced speech ratio.
 */
export class AcousticAnalysisEngine {
  private readonly pitchDetector: AutocorrelationPitchDetector

  constructor() {
    this.pitchDetector = new AutocorrelationPitchDetector()
  }

  public analyze(audioBuffer?: Buffer | Uint8Array): AcousticMetrics {
    if (!audioBuffer || audioBuffer.byteLength < 12) {
      return {
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
        diagnosticMessage: 'No audio waveform payload was provided for acoustic signal processing.',
      }
    }

    try {
      const formatInfo = sniffAudioFormat(audioBuffer)

      // Currently, linear PCM decoding is performed on WAV containers directly
      if (formatInfo.format !== 'wav') {
        return {
          status: 'DEGRADED',
          meanF0Hz: null,
          medianF0Hz: null,
          f0StdDevHz: null,
          pitchMinHz: null,
          pitchMaxHz: null,
          pitchVariationStatus: 'UNAVAILABLE',
          meanRmsEnergyDb: null,
          energyDynamicRangeDb: null,
          voicedFrameRatio: null,
          sampleRateHz: formatInfo.sampleRateHz,
          channelCount: formatInfo.channels,
          diagnosticMessage: `Audio format is ${formatInfo.format.toUpperCase()}. Detailed acoustic DSP requires PCM/WAV conversion.`,
        }
      }

      const decoded = PcmAudioDecoder.decodeWav(audioBuffer)
      const energy = AudioEnergyAnalyzer.analyze(decoded.samples)
      const pitch = this.pitchDetector.analyze(decoded.samples, decoded.sampleRateHz)

      const voicedRatio = pitch.totalFramesCount > 0
        ? Math.round((pitch.voicedFramesCount / pitch.totalFramesCount) * 1000) / 1000
        : 0

      let pitchVariationStatus: AcousticMetrics['pitchVariationStatus'] = 'UNAVAILABLE'
      if (pitch.f0StdDevHz !== null) {
        if (pitch.f0StdDevHz < 14) pitchVariationStatus = 'MONOTONE'
        else if (pitch.f0StdDevHz <= 35) pitchVariationStatus = 'BALANCED'
        else pitchVariationStatus = 'HIGH_VARIATION'
      }

      return {
        status: 'MEASURED',
        meanF0Hz: pitch.meanF0Hz,
        medianF0Hz: pitch.medianF0Hz,
        f0StdDevHz: pitch.f0StdDevHz,
        pitchMinHz: pitch.minF0Hz,
        pitchMaxHz: pitch.maxF0Hz,
        pitchVariationStatus,
        meanRmsEnergyDb: energy.meanRmsDb,
        energyDynamicRangeDb: energy.dynamicRangeDb,
        voicedFrameRatio: voicedRatio,
        sampleRateHz: decoded.sampleRateHz,
        channelCount: decoded.channels,
        diagnosticMessage: 'Measured pitch and energy using frame autocorrelation and Hann windowing.',
      }
    } catch (err) {
      return {
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
        diagnosticMessage: `Acoustic analysis failed: ${err instanceof Error ? err.message : String(err)}`,
      }
    }
  }
}
