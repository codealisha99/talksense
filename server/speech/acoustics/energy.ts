export type RmsEnergyAnalysis = {
  frameEnergyDb: Float32Array
  meanRmsDb: number
  dynamicRangeDb: number
  activeSpeechFrames: number
  totalFrames: number
}

/**
 * Audio energy analyzer.
 * Calculates frame-by-frame RMS energy in dBFS using Hann windowing.
 */
export class AudioEnergyAnalyzer {
  public static analyze(
    samples: Float32Array,
    frameSize: number = 512,
    hopSize: number = 256,
    silenceThresholdDb: number = -45,
  ): RmsEnergyAnalysis {
    const totalSamples = samples.length
    if (totalSamples < frameSize) {
      return {
        frameEnergyDb: new Float32Array(0),
        meanRmsDb: -60,
        dynamicRangeDb: 0,
        activeSpeechFrames: 0,
        totalFrames: 0,
      }
    }

    const numFrames = Math.floor((totalSamples - frameSize) / hopSize) + 1
    const frameEnergyDb = new Float32Array(numFrames)
    let sumDb = 0
    let activeSpeechFrames = 0

    // Precompute Hann window
    const hann = new Float32Array(frameSize)
    for (let i = 0; i < frameSize; i++) {
      hann[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (frameSize - 1)))
    }

    const sortedDbs: number[] = []

    for (let f = 0; f < numFrames; f++) {
      const start = f * hopSize
      let sumSq = 0

      for (let i = 0; i < frameSize; i++) {
        const val = samples[start + i] * hann[i]
        sumSq += val * val
      }

      const rms = Math.sqrt(sumSq / frameSize)
      // Clamped to avoid -Infinity
      const db = 20 * Math.log10(Math.max(1e-6, rms))
      frameEnergyDb[f] = db

      sumDb += db
      sortedDbs.push(db)

      if (db > silenceThresholdDb) {
        activeSpeechFrames++
      }
    }

    sortedDbs.sort((a, b) => a - b)
    const p5 = sortedDbs[Math.floor(sortedDbs.length * 0.05)] ?? -60
    const p95 = sortedDbs[Math.floor(sortedDbs.length * 0.95)] ?? -10

    const meanRmsDb = Math.round((sumDb / numFrames) * 10) / 10
    const dynamicRangeDb = Math.round(Math.max(0, p95 - p5) * 10) / 10

    return {
      frameEnergyDb,
      meanRmsDb,
      dynamicRangeDb,
      activeSpeechFrames,
      totalFrames: numFrames,
    }
  }
}
