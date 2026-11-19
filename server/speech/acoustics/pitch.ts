export type PitchFrame = {
  timeSeconds: number
  f0Hz: number // 0 if unvoiced
  isVoiced: boolean
  correlation: number
}

export type PitchAnalysisResult = {
  frames: PitchFrame[]
  voicedFramesCount: number
  totalFramesCount: number
  meanF0Hz: number | null
  medianF0Hz: number | null
  minF0Hz: number | null
  maxF0Hz: number | null
  f0StdDevHz: number | null
}

/**
 * Autocorrelation fundamental frequency (F0) estimator.
 * Robustly calculates pitch tracks within the human vocal range (75 Hz - 450 Hz)
 * with parabolic peak interpolation and unvoiced frame rejection.
 */
export class AutocorrelationPitchDetector {
  private readonly minPitchHz: number
  private readonly maxPitchHz: number
  private readonly voicingThreshold: number

  constructor(minPitchHz: number = 75, maxPitchHz: number = 450, voicingThreshold: number = 0.45) {
    this.minPitchHz = minPitchHz
    this.maxPitchHz = maxPitchHz
    this.voicingThreshold = voicingThreshold
  }

  public analyze(
    samples: Float32Array,
    sampleRateHz: number = 16000,
    frameSize: number = 800, // 50ms at 16kHz
    hopSize: number = 320, // 20ms at 16kHz
  ): PitchAnalysisResult {
    const totalSamples = samples.length
    if (totalSamples < frameSize || sampleRateHz <= 0) {
      return {
        frames: [],
        voicedFramesCount: 0,
        totalFramesCount: 0,
        meanF0Hz: null,
        medianF0Hz: null,
        minF0Hz: null,
        maxF0Hz: null,
        f0StdDevHz: null,
      }
    }

    const minLag = Math.floor(sampleRateHz / this.maxPitchHz)
    const maxLag = Math.min(frameSize - 2, Math.ceil(sampleRateHz / this.minPitchHz))

    const numFrames = Math.floor((totalSamples - frameSize) / hopSize) + 1
    const frames: PitchFrame[] = []
    const voicedF0s: number[] = []

    for (let f = 0; f < numFrames; f++) {
      const start = f * hopSize
      const timeSeconds = Math.round(((start + frameSize / 2) / sampleRateHz) * 1000) / 1000

      // Calculate energy at lag 0 (R(0))
      let r0 = 0
      for (let i = 0; i < frameSize; i++) {
        const val = samples[start + i]
        r0 += val * val
      }

      // Check if frame has enough energy to be voiced (not dead silence)
      if (r0 < 1e-4) {
        frames.push({ timeSeconds, f0Hz: 0, isVoiced: false, correlation: 0 })
        continue
      }

      let bestLag = -1
      let bestCorrelation = -1

      for (let lag = minLag; lag <= maxLag; lag++) {
        let rLag = 0
        let normLag = 0

        for (let i = 0; i < frameSize - lag; i++) {
          const s1 = samples[start + i]
          const s2 = samples[start + i + lag]
          rLag += s1 * s2
          normLag += s2 * s2
        }

        const norm = Math.sqrt(r0 * normLag)
        const corr = norm > 0 ? rLag / norm : 0

        if (corr > bestCorrelation) {
          bestCorrelation = corr
          bestLag = lag
        }
      }

      if (bestCorrelation >= this.voicingThreshold && bestLag > minLag && bestLag < maxLag) {
        // Parabolic interpolation for sub-sample lag refinement
        let rLeft = 0
        let rRight = 0
        for (let i = 0; i < frameSize - bestLag; i++) {
          rLeft += samples[start + i] * samples[start + i + bestLag - 1]
          rRight += samples[start + i] * samples[start + i + bestLag + 1]
        }
        const delta = (rRight - rLeft) / (2 * (2 * bestCorrelation - rLeft - rRight) || 1)
        const refinedLag = bestLag + Math.max(-0.5, Math.min(0.5, delta))

        const f0Hz = Math.round((sampleRateHz / refinedLag) * 10) / 10
        if (f0Hz >= this.minPitchHz && f0Hz <= this.maxPitchHz) {
          frames.push({ timeSeconds, f0Hz, isVoiced: true, correlation: bestCorrelation })
          voicedF0s.push(f0Hz)
          continue
        }
      }

      frames.push({ timeSeconds, f0Hz: 0, isVoiced: false, correlation: bestCorrelation })
    }

    if (voicedF0s.length === 0) {
      return {
        frames,
        voicedFramesCount: 0,
        totalFramesCount: numFrames,
        meanF0Hz: null,
        medianF0Hz: null,
        minF0Hz: null,
        maxF0Hz: null,
        f0StdDevHz: null,
      }
    }

    voicedF0s.sort((a, b) => a - b)
    const sumF0 = voicedF0s.reduce((a, b) => a + b, 0)
    const meanF0Hz = Math.round((sumF0 / voicedF0s.length) * 10) / 10
    const medianF0Hz = voicedF0s[Math.floor(voicedF0s.length / 2)]
    const minF0Hz = voicedF0s[0]
    const maxF0Hz = voicedF0s[voicedF0s.length - 1]

    const variance =
      voicedF0s.reduce((acc, f0) => acc + Math.pow(f0 - meanF0Hz, 2), 0) / voicedF0s.length
    const f0StdDevHz = Math.round(Math.sqrt(variance) * 10) / 10

    return {
      frames,
      voicedFramesCount: voicedF0s.length,
      totalFramesCount: numFrames,
      meanF0Hz,
      medianF0Hz,
      minF0Hz,
      maxF0Hz,
      f0StdDevHz,
    }
  }
}
