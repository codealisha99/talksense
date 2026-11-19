import { mkdir, readFile, unlink, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { AudioStorageError } from '../errors.ts'
import type { AudioFormat, AudioStorageProvider, StoredAudioReference } from './types.ts'

/**
 * Local disk implementation of AudioStorageProvider.
 * Provides isolated storage with path traversal protection and device ownership validation.
 */
export class LocalAudioStorageProvider implements AudioStorageProvider {
  private readonly baseDir: string

  constructor(baseDir?: string) {
    this.baseDir = resolve(baseDir ?? process.env.AUDIO_STORAGE_PATH ?? './.data/recordings')
  }

  private sanitizeFilename(id: string, format: string): string {
    const cleanId = id.replace(/[^a-zA-Z0-9-]/g, '')
    const cleanExt = format.replace(/[^a-zA-Z0-9]/g, '')
    return `${cleanId}.${cleanExt}`
  }

  private resolveSafePath(deviceId: string, filename: string): string {
    const cleanDevice = deviceId.replace(/[^a-zA-Z0-9-]/g, '')
    const targetPath = resolve(join(this.baseDir, cleanDevice, filename))
    if (!targetPath.startsWith(this.baseDir)) {
      throw new AudioStorageError('Unauthorized path traversal detected.')
    }
    return targetPath
  }

  async save(
    recordingId: string,
    sessionId: string,
    deviceId: string,
    buffer: Buffer | Uint8Array,
    format: AudioFormat,
  ): Promise<StoredAudioReference> {
    try {
      const cleanDevice = deviceId.replace(/[^a-zA-Z0-9-]/g, '')
      const deviceFolder = join(this.baseDir, cleanDevice)
      await mkdir(deviceFolder, { recursive: true })

      const filename = this.sanitizeFilename(recordingId, format)
      const filePath = this.resolveSafePath(deviceId, filename)

      const { writeFile } = await import('node:fs/promises')
      await writeFile(filePath, buffer)

      const sizeBytes = buffer.byteLength
      const storageKey = `${cleanDevice}/${filename}`

      return {
        recordingId,
        sessionId,
        deviceId,
        storageKey,
        format,
        sizeBytes,
        durationSeconds: 0, // Enriched later by metadata parser
        createdAt: new Date().toISOString(),
        consentGiven: true,
      }
    } catch (err) {
      throw new AudioStorageError(
        `Failed to persist audio file: ${err instanceof Error ? err.message : String(err)}`,
        recordingId,
      )
    }
  }

  async read(storageKey: string, deviceId: string): Promise<Buffer> {
    try {
      const parts = storageKey.split('/')
      if (parts.length !== 2) throw new AudioStorageError('Invalid storage key format.')
      const [keyDevice, filename] = parts
      if (keyDevice !== deviceId.replace(/[^a-zA-Z0-9-]/g, '')) {
        throw new AudioStorageError('Device access denied for this recording.')
      }

      const filePath = this.resolveSafePath(deviceId, filename)
      return await readFile(filePath)
    } catch (err) {
      if (err instanceof AudioStorageError) throw err
      throw new AudioStorageError(`Failed to read audio file: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  async delete(storageKey: string, deviceId: string): Promise<boolean> {
    try {
      const parts = storageKey.split('/')
      if (parts.length !== 2) return false
      const [keyDevice, filename] = parts
      if (keyDevice !== deviceId.replace(/[^a-zA-Z0-9-]/g, '')) {
        throw new AudioStorageError('Device access denied for recording deletion.')
      }

      const filePath = this.resolveSafePath(deviceId, filename)
      await unlink(filePath)
      return true
    } catch (err: any) {
      if (err?.code === 'ENOENT') return false
      throw new AudioStorageError(`Failed to delete recording: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  getPlaybackUrl(recordingId: string): string {
    return `/api/recordings/${recordingId}/audio`
  }

  async healthCheck(): Promise<boolean> {
    try {
      await mkdir(this.baseDir, { recursive: true })
      const s = await stat(this.baseDir)
      return s.isDirectory()
    } catch {
      return false
    }
  }
}
