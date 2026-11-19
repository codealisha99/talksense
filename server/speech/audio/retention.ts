import type { AudioStorageProvider } from './types.ts'

export type RetentionPolicy = {
  maxAgeDays: number
  requireConsentForStorage: boolean
  autoDeleteOnSessionDelete: boolean
}

export const DEFAULT_RETENTION_POLICY: RetentionPolicy = {
  maxAgeDays: 30, // Retain audio for 30 days unless deleted earlier
  requireConsentForStorage: true,
  autoDeleteOnSessionDelete: true,
}

export class AudioRetentionManager {
  private readonly storage: AudioStorageProvider
  private readonly policy: RetentionPolicy

  constructor(storage: AudioStorageProvider, policy: Partial<RetentionPolicy> = {}) {
    this.storage = storage
    this.policy = { ...DEFAULT_RETENTION_POLICY, ...policy }
  }

  isConsentGranted(consentValue: unknown): boolean {
    if (!this.policy.requireConsentForStorage) return true
    return consentValue === true || consentValue === 'true' || consentValue === 1
  }

  isExpired(createdAtIso: string, now: Date = new Date()): boolean {
    const createdTime = new Date(createdAtIso).getTime()
    const ageMs = now.getTime() - createdTime
    const maxAgeMs = this.policy.maxAgeDays * 24 * 60 * 60 * 1000
    return ageMs > maxAgeMs
  }

  async deleteRecordingAndDerived(
    storageKey: string,
    deviceId: string,
    deleteDbRecordCallback?: () => Promise<void>,
  ): Promise<{ audioDeleted: boolean; derivedDeleted: boolean }> {
    const audioDeleted = await this.storage.delete(storageKey, deviceId)
    let derivedDeleted = false
    if (deleteDbRecordCallback) {
      await deleteDbRecordCallback()
      derivedDeleted = true
    }
    return { audioDeleted, derivedDeleted }
  }
}
