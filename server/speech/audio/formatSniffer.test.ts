import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sniffAudioFormat } from './formatSniffer.ts'
import { AudioFormatError } from '../errors.ts'

test('sniffAudioFormat identifies WebM files by EBML header', () => {
  const buf = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01, 0x42, 0xf7, 0x81, 0x01])
  const info = sniffAudioFormat(buf)
  assert.equal(info.format, 'webm')
  assert.equal(info.mimeType, 'audio/webm')
})

test('sniffAudioFormat identifies Ogg files by OggS header', () => {
  const buf = Buffer.from([0x4f, 0x67, 0x67, 0x53, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
  const info = sniffAudioFormat(buf)
  assert.equal(info.format, 'ogg')
  assert.equal(info.mimeType, 'audio/ogg')
})

test('sniffAudioFormat identifies MP4 files by ftyp box', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32])
  const info = sniffAudioFormat(buf)
  assert.equal(info.format, 'mp4')
  assert.equal(info.mimeType, 'audio/mp4')
})

test('sniffAudioFormat parses standard WAV header with sample rate and duration', () => {
  // Construct minimal valid WAV header
  // 44 bytes header + 32000 bytes PCM data (16kHz, mono, 16-bit = 32000 B/s -> exactly 1.0 second)
  const sampleRate = 16000
  const channels = 1
  const bitsPerSample = 16
  const byteRate = sampleRate * channels * (bitsPerSample / 8)
  const dataSize = 32000

  const buf = Buffer.alloc(44 + dataSize)
  // RIFF chunk
  buf.write('RIFF', 0)
  buf.writeUInt32LE(36 + dataSize, 4)
  buf.write('WAVE', 8)
  // fmt subchunk
  buf.write('fmt ', 12)
  buf.writeUInt32LE(16, 16) // Subchunk1Size for PCM
  buf.writeUInt16LE(1, 20)  // AudioFormat 1 = PCM
  buf.writeUInt16LE(channels, 22)
  buf.writeUInt32LE(sampleRate, 24)
  buf.writeUInt32LE(byteRate, 28)
  buf.writeUInt16LE(channels * (bitsPerSample / 8), 32)
  buf.writeUInt16LE(bitsPerSample, 34)
  // data subchunk
  buf.write('data', 36)
  buf.writeUInt32LE(dataSize, 40)

  const info = sniffAudioFormat(buf)
  assert.equal(info.format, 'wav')
  assert.equal(info.sampleRateHz, 16000)
  assert.equal(info.channels, 1)
  assert.equal(info.durationSeconds, 1.0)
})

test('sniffAudioFormat throws AudioFormatError when payload is too small', () => {
  assert.throws(
    () => sniffAudioFormat(Buffer.from([0x00, 0x01])),
    (err: any) => err instanceof AudioFormatError,
  )
})
