import { AudioFormatError } from '../errors.ts'
import type { AudioFormat } from './types.ts'

export type SniffedAudioInfo = {
  format: AudioFormat
  mimeType: string
  sampleRateHz: number | null
  channels: number | null
  durationSeconds: number | null
  sizeBytes: number
}

/**
 * Inspects binary magic headers to reliably identify audio container formats.
 * Avoids trusting client-supplied file extensions or MIME headers blindly.
 */
export function sniffAudioFormat(buffer: Buffer | Uint8Array): SniffedAudioInfo {
  const sizeBytes = buffer.byteLength
  if (sizeBytes < 12) {
    throw new AudioFormatError('Audio payload is too small to contain valid audio container headers.')
  }

  // Check WAV: "RIFF" .... "WAVE"
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x41 && buffer[10] === 0x56 && buffer[11] === 0x45
  ) {
    return parseWavHeader(buffer)
  }

  // Check WebM / EBML: 0x1A 0x45 0xDF 0xA3
  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
    return {
      format: 'webm',
      mimeType: 'audio/webm',
      sampleRateHz: null, // EBML variable rate, parsed dynamically
      channels: null,
      durationSeconds: null,
      sizeBytes,
    }
  }

  // Check Ogg: "OggS"
  if (buffer[0] === 0x4f && buffer[1] === 0x67 && buffer[2] === 0x67 && buffer[3] === 0x53) {
    return {
      format: 'ogg',
      mimeType: 'audio/ogg',
      sampleRateHz: null,
      channels: null,
      durationSeconds: null,
      sizeBytes,
    }
  }

  // Check MP4 / M4A: bytes 4-7 equal "ftyp"
  if (
    sizeBytes >= 8 &&
    buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70
  ) {
    return {
      format: 'mp4',
      mimeType: 'audio/mp4',
      sampleRateHz: null,
      channels: null,
      durationSeconds: null,
      sizeBytes,
    }
  }

  // Check MP3 ID3v2: "ID3"
  if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) {
    return {
      format: 'mp3',
      mimeType: 'audio/mpeg',
      sampleRateHz: null,
      channels: null,
      durationSeconds: null,
      sizeBytes,
    }
  }

  // Check MP3 raw frame sync: 11 bits set (0xFF followed by 0xE0 mask)
  if (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) {
    return {
      format: 'mp3',
      mimeType: 'audio/mpeg',
      sampleRateHz: null,
      channels: null,
      durationSeconds: null,
      sizeBytes,
    }
  }

  return {
    format: 'unknown',
    mimeType: 'application/octet-stream',
    sampleRateHz: null,
    channels: null,
    durationSeconds: null,
    sizeBytes,
  }
}

/**
 * Extracts sample rate, channels, bit depth, and duration from standard RIFF/WAVE headers.
 */
function parseWavHeader(buffer: Buffer | Uint8Array): SniffedAudioInfo {
  const sizeBytes = buffer.byteLength
  let offset = 12
  let sampleRate: number | null = null
  let channels: number | null = null
  let byteRate: number | null = null
  let dataSize: number | null = null

  // Iterate over subchunks (e.g. "fmt ", "data")
  while (offset + 8 <= sizeBytes) {
    const chunkId = String.fromCharCode(
      buffer[offset], buffer[offset + 1], buffer[offset + 2], buffer[offset + 3]
    )
    const chunkSize =
      buffer[offset + 4] |
      (buffer[offset + 5] << 8) |
      (buffer[offset + 6] << 16) |
      (buffer[offset + 7] << 24)

    if (chunkId === 'fmt ' && offset + 8 + 16 <= sizeBytes) {
      channels = buffer[offset + 10] | (buffer[offset + 11] << 8)
      sampleRate =
        buffer[offset + 12] |
        (buffer[offset + 13] << 8) |
        (buffer[offset + 14] << 16) |
        (buffer[offset + 15] << 24)
      byteRate =
        buffer[offset + 16] |
        (buffer[offset + 17] << 8) |
        (buffer[offset + 18] << 16) |
        (buffer[offset + 19] << 24)
    } else if (chunkId === 'data') {
      dataSize = chunkSize
      break
    }

    offset += 8 + chunkSize
  }

  let durationSeconds: number | null = null
  if (dataSize && byteRate && byteRate > 0) {
    durationSeconds = Math.round((dataSize / byteRate) * 100) / 100
  }

  return {
    format: 'wav',
    mimeType: 'audio/wav',
    sampleRateHz: sampleRate,
    channels,
    durationSeconds,
    sizeBytes,
  }
}
