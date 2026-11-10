import type { Brief, HistoryItem, PublicResult } from './rubric.ts'
import type { Niche, RandomTopic } from './topics.ts'

const KEY_STORAGE = 'talksense.key'
const DEVICE_STORAGE = 'talksense.device'

/** Anonymous per-browser id: owns sessions and history without needing an account. */
export const deviceId: string = (() => {
  const existing = localStorage.getItem(DEVICE_STORAGE)
  if (existing) return existing
  const id = crypto.randomUUID()
  localStorage.setItem(DEVICE_STORAGE, id)
  return id
})()

export const getKey = () => localStorage.getItem(KEY_STORAGE) ?? ''
export const setKey = (key: string) =>
  key ? localStorage.setItem(KEY_STORAGE, key) : localStorage.removeItem(KEY_STORAGE)

async function request<T>(path: string, init: RequestInit = {}, json?: unknown): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('x-openai-key', getKey())
  if (json !== undefined) headers.set('content-type', 'application/json')
  let res: Response
  try {
    res = await fetch(`/api${path}`, { ...init, headers, body: json !== undefined ? JSON.stringify(json) : init.body })
  } catch {
    throw new Error("Can't reach Talksense. Check your connection and try again.")
  }
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new Error(body?.error ?? `Something went wrong (${res.status}).`)
  return body.data as T
}

const post = <T>(path: string, json: unknown) => request<T>(path, { method: 'POST' }, json)

export const api = {
  randomTopic: (niche: Niche | null) =>
    post<RandomTopic & { niche: Niche }>('/topics/random', { deviceId, niche }),
  createSession: (topic: string, minutes: number) =>
    post<{ id: string; brief: Brief }>('/sessions', { deviceId, topic, minutes }),
  start: (id: string) => post<{ startedAt: string }>(`/sessions/${id}/start`, { deviceId }),
  transcribeAudio: (id: string, audio: Blob) => {
    const form = new FormData()
    const ext = audio.type.includes('mp4') ? 'mp4' : audio.type.includes('ogg') ? 'ogg' : 'webm'
    form.append('deviceId', deviceId)
    form.append('audio', audio, `answer.${ext}`)
    return request<{ transcript: string }>(`/sessions/${id}/transcript`, { method: 'POST', body: form })
  },
  submitText: (id: string, text: string) => post<{ transcript: string }>(`/sessions/${id}/transcript`, { deviceId, text }),
  grade: (id: string) => post<PublicResult>(`/sessions/${id}/grade`, { deviceId }),
  result: (id: string) => request<PublicResult>(`/results/${id}`),
  history: () => request<HistoryItem[]>(`/devices/${deviceId}/history`),
}
