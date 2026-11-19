import { z } from 'zod'

export const AudioFormatEnum = z.enum(['webm', 'mp4', 'ogg', 'wav', 'mp3', 'm4a', 'unknown'])
export type AudioFormat = z.infer<typeof AudioFormatEnum>

export const AudioMetadataSchema = z.object({
  recordingId: z.string().uuid(),
  sessionId: z.string().uuid(),
  deviceId: z.string().uuid(),
  durationSeconds: z.number().nonnegative(),
  format: AudioFormatEnum,
  mimeType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  sampleRateHz: z.number().int().positive().nullable().default(null),
  channels: z.number().int().positive().nullable().default(null),
  createdAt: z.string().datetime(),
  consentGiven: z.boolean().default(true),
})
export type AudioMetadata = z.infer<typeof AudioMetadataSchema>

export type StoredAudioReference = {
  recordingId: string
  sessionId: string
  deviceId: string
  storageKey: string
  format: AudioFormat
  sizeBytes: number
  durationSeconds: number
  createdAt: string
  consentGiven: boolean
}

export interface AudioStorageProvider {
  save(
    recordingId: string,
    sessionId: string,
    deviceId: string,
    buffer: Buffer | Uint8Array,
    format: AudioFormat,
  ): Promise<StoredAudioReference>

  read(storageKey: string, deviceId: string): Promise<Buffer>

  delete(storageKey: string, deviceId: string): Promise<boolean>

  getPlaybackUrl(recordingId: string): string

  healthCheck(): Promise<boolean>
}
