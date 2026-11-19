import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { LocalAudioStorageProvider } from './localStorage.ts'
import { AudioStorageError } from '../errors.ts'

test('LocalAudioStorageProvider saves, reads, and deletes audio correctly', async () => {
  const testDir = join(tmpdir(), `talksense-test-${Date.now()}`)
  const storage = new LocalAudioStorageProvider(testDir)

  const recordingId = 'rec-12345'
  const sessionId = 'ses-99999'
  const deviceId = 'dev-77777'
  const dummyAudio = Buffer.from('RIFF....WAVEfmt ....data....')

  try {
    const saved = await storage.save(recordingId, sessionId, deviceId, dummyAudio, 'wav')
    assert.equal(saved.recordingId, recordingId)
    assert.equal(saved.deviceId, deviceId)
    assert.equal(saved.sizeBytes, dummyAudio.byteLength)

    const readBack = await storage.read(saved.storageKey, deviceId)
    assert.deepEqual(readBack, dummyAudio)

    // Unauthorized device cannot read
    await assert.rejects(
      storage.read(saved.storageKey, 'dev-other-device'),
      (err: any) => err instanceof AudioStorageError && err.message.includes('Device access denied'),
    )

    // Delete
    const deleted = await storage.delete(saved.storageKey, deviceId)
    assert.equal(deleted, true)

    // Re-delete returns false
    const deletedAgain = await storage.delete(saved.storageKey, deviceId)
    assert.equal(deletedAgain, false)
  } finally {
    await rm(testDir, { recursive: true, force: true }).catch(() => {})
  }
})

test('LocalAudioStorageProvider prevents path traversal attacks', async () => {
  const testDir = join(tmpdir(), `talksense-sec-${Date.now()}`)
  const storage = new LocalAudioStorageProvider(testDir)

  try {
    const maliciousDevice = '../../etc'
    const dummyAudio = Buffer.from('test')

    // Sanitization strips illegal characters like dots and slashes
    const saved = await storage.save('rec-1', 'ses-1', maliciousDevice, dummyAudio, 'wav')
    assert.ok(!saved.storageKey.includes('..'))
  } finally {
    await rm(testDir, { recursive: true, force: true }).catch(() => {})
  }
})
