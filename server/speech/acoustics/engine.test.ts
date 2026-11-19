import { test } from 'node:test'
import assert from 'node:assert/strict'
import { AcousticAnalysisEngine } from './engine.ts'
import { PcmAudioDecoder } from './pcmDecoder.ts'

test('AcousticAnalysisEngine measures pitch F0 accurately on synthetic 150Hz sine tone', () => {
  const engine = new AcousticAnalysisEngine()

  // Generate 1.0 second of pure 150 Hz sine wave at 16kHz
  const wavBuffer = PcmAudioDecoder.createSyntheticWav(150, 1.0, 16000, 0.6)

  const metrics = engine.analyze(wavBuffer)

  assert.equal(metrics.status, 'MEASURED')
  assert.equal(metrics.sampleRateHz, 16000)
  assert.equal(metrics.channelCount, 1)

  // Verify pitch measurement accuracy: 150 Hz +/- 3 Hz
  assert.ok(metrics.meanF0Hz !== null)
  assert.ok(
    Math.abs(metrics.meanF0Hz - 150) <= 3.0,
    `Expected pitch ~150Hz, got ${metrics.meanF0Hz}Hz`,
  )

  // Pure steady sine wave has very low standard deviation -> MONOTONE
  assert.equal(metrics.pitchVariationStatus, 'MONOTONE')

  // Voiced ratio should be high for continuous tone
  assert.ok(metrics.voicedFrameRatio !== null && metrics.voicedFrameRatio > 0.8)
})

test('AcousticAnalysisEngine handles silence without falsely detecting pitch', () => {
  const engine = new AcousticAnalysisEngine()

  // Generate 1.0 second of complete silence
  const silenceBuffer = PcmAudioDecoder.createSyntheticWav(0, 1.0, 16000, 0.0)

  const metrics = engine.analyze(silenceBuffer)

  assert.equal(metrics.status, 'MEASURED')
  // Pitch cannot be detected on dead silence
  assert.equal(metrics.meanF0Hz, null)
  assert.equal(metrics.voicedFrameRatio, 0)
})

test('AcousticAnalysisEngine handles non-WAV container gracefully without crashing', () => {
  const engine = new AcousticAnalysisEngine()

  // WebM magic bytes
  const webmFakeBuffer = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])

  const metrics = engine.analyze(webmFakeBuffer)

  assert.equal(metrics.status, 'DEGRADED')
  assert.ok(metrics.diagnosticMessage?.includes('WEBM'))
})

test('AcousticAnalysisEngine handles empty buffer with UNAVAILABLE status', () => {
  const engine = new AcousticAnalysisEngine()

  const metrics = engine.analyze(Buffer.alloc(0))

  assert.equal(metrics.status, 'UNAVAILABLE')
  assert.equal(metrics.meanF0Hz, null)
})
