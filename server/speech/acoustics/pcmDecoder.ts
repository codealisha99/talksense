import { AudioFormatError } from '../errors.ts'

export type DecodedPcmData = {
  samples: Float32Array
  sampleRateHz: number
  channels: number
  durationSeconds: number
}

/**
 * Decodes standard 16-bit PCM WAV containers or raw PCM buffers into mono Float32Array samples.
 */
export class PcmAudioDecoder {
  public static decodeWav(buffer: Buffer | Uint8Array): DecodedPcmData {
    if (buffer.byteLength < 44) {
      throw new AudioFormatError('WAV buffer too small for header.')
    }

    // Verify RIFF / WAVE
    const riff = String.fromCharCode(buffer[0], buffer[1], buffer[2], buffer[3])
    const wave = String.fromCharCode(buffer[8], buffer[9], buffer[10], buffer[11])
    if (riff !== 'RIFF' || wave !== 'WAVE') {
      throw new AudioFormatError('Not a valid RIFF/WAVE container.')
    }

    let offset = 12
    let sampleRate = 16000
    let channels = 1
    let bitsPerSample = 16
    let dataOffset = 44
    let dataLength = 0

    while (offset + 8 <= buffer.byteLength) {
      const chunkId = String.fromCharCode(
        buffer[offset], buffer[offset + 1], buffer[offset + 2], buffer[offset + 3]
      )
      const chunkSize =
        buffer[offset + 4] |
        (buffer[offset + 5] << 8) |
        (buffer[offset + 6] << 16) |
        (buffer[offset + 7] << 24)

      if (chunkId === 'fmt ') {
        channels = buffer[offset + 10] | (buffer[offset + 11] << 8)
        sampleRate =
          buffer[offset + 12] |
          (buffer[offset + 13] << 8) |
          (buffer[offset + 14] << 16) |
          (buffer[offset + 15] << 24)
        bitsPerSample = buffer[offset + 22] | (buffer[offset + 23] << 8)
      } else if (chunkId === 'data') {
        dataOffset = offset + 8
        dataLength = Math.min(chunkSize, buffer.byteLength - dataOffset)
        break
      }

      offset += 8 + chunkSize
    }

    if (bitsPerSample !== 16) {
      throw new AudioFormatError(`Unsupported WAV bit depth: ${bitsPerSample}-bit. 16-bit PCM required.`)
    }

    const bytesPerSample = 2
    const totalSamples = Math.floor(dataLength / (bytesPerSample * channels))
    const monoSamples = new Float32Array(totalSamples)

    // Convert 16-bit signed integers to float [-1.0, 1.0] and downmix to mono
    let srcByte = dataOffset
    for (let i = 0; i < totalSamples; i++) {
      let sum = 0
      for (let ch = 0; ch < channels; ch++) {
        // Read 16-bit signed LE
        let val = buffer[srcByte] | (buffer[srcByte + 1] << 8)
        if (val & 0x8000) val |= ~0xffff // sign extension
        sum += val / 32768.0
        srcByte += 2
      }
      monoSamples[i] = sum / channels
    }

    const durationSeconds = sampleRate > 0 ? totalSamples / sampleRate : 0

    return {
      samples: monoSamples,
      sampleRateHz: sampleRate,
      channels,
      durationSeconds: Math.round(durationSeconds * 100) / 100,
    }
  }

  /**
   * Generates a synthesized test tone (sine wave) for audio unit tests.
   */
  public static createSyntheticWav(
    frequencyHz: number,
    durationSeconds: number,
    sampleRateHz: number = 16000,
    amplitude: number = 0.5,
  ): Buffer {
    const totalSamples = Math.floor(sampleRateHz * durationSeconds)
    const bytesPerSample = 2
    const dataSize = totalSamples * bytesPerSample
    const buf = Buffer.alloc(44 + dataSize)

    // RIFF chunk
    buf.write('RIFF', 0)
    buf.writeUInt32LE(36 + dataSize, 4)
    buf.write('WAVE', 8)
    // fmt subchunk
    buf.write('fmt ', 12)
    buf.writeUInt32LE(16, 16)
    buf.writeUInt16LE(1, 20) // PCM
    buf.writeUInt16LE(1, 22) // Mono
    buf.writeUInt32LE(sampleRateHz, 24)
    buf.writeUInt32LE(sampleRateHz * bytesPerSample, 28) // byte rate
    buf.writeUInt16LE(bytesPerSample, 32)
    buf.writeUInt16LE(16, 34) // 16-bit
    // data subchunk
    buf.write('data', 36)
    buf.writeUInt32LE(dataSize, 40)

    let offset = 44
    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRateHz
      const sample = Math.sin(2 * Math.PI * frequencyHz * t) * amplitude
      const intSample = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)))
      buf.writeInt16LE(intSample, offset)
      offset += 2
    }

    return buf
  }
}
