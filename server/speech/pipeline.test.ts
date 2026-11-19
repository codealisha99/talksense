import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SpeechAnalysisPipeline } from './pipeline.ts'
import type { NormalizedTranscript } from '../../src/speech.ts'

function createSyntheticWav(durationSeconds: number, sampleRate = 16000): Buffer {
  const numSamples = Math.floor(sampleRate * durationSeconds)
  const headerSize = 44
  const dataSize = numSamples * 2
  const buf = Buffer.alloc(headerSize + dataSize)

  buf.write('RIFF', 0)
  buf.writeUInt32LE(headerSize + dataSize - 8, 4)
  buf.write('WAVE', 8)
  buf.write('fmt ', 12)
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20)
  buf.writeUInt16LE(1, 22)
  buf.writeUInt32LE(sampleRate, 24)
  buf.writeUInt32LE(sampleRate * 2, 28)
  buf.writeUInt16LE(2, 32)
  buf.writeUInt16LE(16, 34)
  buf.write('data', 36)
  buf.writeUInt32LE(dataSize, 40)

  // 150 Hz tone
  const freq = 150
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate
    const sample = Math.sin(2 * Math.PI * freq * t) * 16000
    buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(sample))), 44 + i * 2)
  }

  return buf
}

test('SpeechAnalysisPipeline runs end-to-end and computes all intelligence sections', async () => {
  const pipeline = new SpeechAnalysisPipeline()

  const transcript: NormalizedTranscript = {
    text: 'Um, machine learning is basically teaching computers, you know, to recognize patterns.',
    durationSeconds: 6.0,
    language: 'en',
    provider: 'openai-whisper',
    words: [
      { text: 'Um', start: 0.1, end: 0.4, confidence: 0.9, punctuatedText: 'Um,' },
      { text: 'machine', start: 0.7, end: 1.0, confidence: 0.95, punctuatedText: 'machine' },
      { text: 'learning', start: 1.1, end: 1.6, confidence: 0.96, punctuatedText: 'learning' },
      { text: 'is', start: 1.7, end: 1.9, confidence: 0.98, punctuatedText: 'is' },
      { text: 'basically', start: 2.0, end: 2.6, confidence: 0.93, punctuatedText: 'basically' },
      { text: 'teaching', start: 2.7, end: 3.2, confidence: 0.97, punctuatedText: 'teaching' },
      { text: 'computers', start: 3.3, end: 3.9, confidence: 0.96, punctuatedText: 'computers,' },
      { text: 'you', start: 4.5, end: 4.7, confidence: 0.92, punctuatedText: 'you' },
      { text: 'know', start: 4.75, end: 5.0, confidence: 0.94, punctuatedText: 'know,' },
      { text: 'to', start: 5.1, end: 5.25, confidence: 0.95, punctuatedText: 'to' },
      { text: 'recognize', start: 5.3, end: 5.7, confidence: 0.97, punctuatedText: 'recognize' },
      { text: 'patterns', start: 5.75, end: 6.0, confidence: 0.98, punctuatedText: 'patterns.' },
    ],
  }

  const audioBuf = createSyntheticWav(6.0)

  const report = await pipeline.run(transcript, {
    sessionId: 'session-integration-test-1',
    recordingId: 'rec-test-1',
    audioBuffer: audioBuf,
    audioPlayableUrl: '/recordings/rec-test-1/audio',
  })

  // Pace & vocabulary verification
  assert.equal(report.language.vocabulary.totalWords, 12)
  assert.ok(report.pace.overallWpm > 0)
  assert.ok(report.pace.activeWpm >= report.pace.overallWpm)

  // Filler verification
  assert.equal(report.fillers.totalCount, 3) // "Um", "basically", "you know"
  assert.ok(report.fillers.occurrences.some((f) => f.canonical.toLowerCase() === 'um' && f.classification === 'CONFIRMED_FILLER'))

  // Pause verification
  assert.ok(report.pauses.totalPauses >= 2)
  assert.ok(report.pauses.events.length > 0)

  // Language & Repetition
  assert.ok(report.language.vocabulary.typeTokenRatio > 0)
  assert.ok(Array.isArray(report.language.grammarIssues))
  assert.ok(Array.isArray(report.repetition.events))

  // Acoustics verification
  assert.equal(report.acoustics.status, 'MEASURED')
  assert.ok(report.acoustics.meanF0Hz !== null)
  assert.ok(report.acoustics.meanF0Hz >= 140 && report.acoustics.meanF0Hz <= 160)

  // Playback & consent
  assert.equal(report.audioPlayableUrl, '/recordings/rec-test-1/audio')
  assert.equal(report.recordingId, 'rec-test-1')
})

test('SpeechAnalysisPipeline gracefully degrades acoustics when audio is missing or non-WAV', async () => {
  const pipeline = new SpeechAnalysisPipeline()

  const transcript: NormalizedTranscript = {
    text: 'A quick explanation of distributed consensus mechanisms and ledger state replication.',
    durationSeconds: 4.5,
    language: 'en',
    provider: 'openai-whisper',
    words: [
      { text: 'A', start: 0.1, end: 0.3, confidence: 0.9, punctuatedText: 'A' },
      { text: 'quick', start: 0.35, end: 0.7, confidence: 0.9, punctuatedText: 'quick' },
      { text: 'explanation', start: 0.75, end: 1.5, confidence: 0.9, punctuatedText: 'explanation' },
      { text: 'of', start: 1.55, end: 1.7, confidence: 0.9, punctuatedText: 'of' },
      { text: 'distributed', start: 1.75, end: 2.4, confidence: 0.9, punctuatedText: 'distributed' },
      { text: 'consensus', start: 2.45, end: 3.0, confidence: 0.9, punctuatedText: 'consensus' },
      { text: 'mechanisms', start: 3.05, end: 3.6, confidence: 0.9, punctuatedText: 'mechanisms' },
      { text: 'and', start: 3.65, end: 3.8, confidence: 0.9, punctuatedText: 'and' },
      { text: 'ledger', start: 3.85, end: 4.1, confidence: 0.9, punctuatedText: 'ledger' },
      { text: 'state', start: 4.15, end: 4.3, confidence: 0.9, punctuatedText: 'state' },
      { text: 'replication', start: 4.35, end: 4.8, confidence: 0.9, punctuatedText: 'replication.' },
    ],
  }

  // Missing audio buffer
  const report = await pipeline.run(transcript, {
    sessionId: 'session-integration-test-2',
    recordingId: null,
    audioBuffer: undefined,
    audioPlayableUrl: null,
  })

  assert.equal(report.acoustics.status, 'UNAVAILABLE')
  assert.ok(report.language.vocabulary.totalWords === 11)
  assert.ok(report.fillers.totalCount === 0)
  assert.equal(report.recordingId, null)
})
