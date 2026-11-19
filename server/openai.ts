// The user's own key arrives per request and is forwarded to OpenAI. It is never stored or logged.
const BASE = 'https://api.openai.com/v1'

export class UpstreamError extends Error {
  status: 400 | 401 | 429 | 502
  constructor(message: string, status: UpstreamError['status']) {
    super(message)
    this.status = status
  }
}

async function call(path: string, key: string, init: RequestInit): Promise<any> {
  let res: Response
  try {
    res = await fetch(BASE + path, {
      ...init,
      headers: { Authorization: `Bearer ${key}`, ...init.headers },
      signal: AbortSignal.timeout(120_000),
    })
  } catch {
    throw new UpstreamError('Could not reach OpenAI. Please try again.', 502)
  }
  const body = await res.json().catch(() => null)
  if (res.ok) return body
  if (res.status === 401) throw new UpstreamError('OpenAI rejected your API key. Update it in settings.', 401)
  if (res.status === 429) throw new UpstreamError('Your OpenAI key hit a rate limit or ran out of credit.', 429)
  if (res.status === 400) throw new UpstreamError(`OpenAI couldn't process that: ${body?.error?.message ?? 'bad request'}`, 400)
  throw new UpstreamError(`OpenAI error (${res.status}). Please try again.`, 502)
}

export type RawWhisperWord = {
  word: string
  start: number
  end: number
}

export type RawWhisperSegment = {
  id: number
  start: number
  end: number
  text: string
}

export type RawWhisperVerboseResponse = {
  text: string
  language?: string
  duration?: number
  words?: RawWhisperWord[]
  segments?: RawWhisperSegment[]
}

export async function transcribe(key: string, model: string, audio: File): Promise<string> {
  const form = new FormData()
  form.append('file', audio, audio.name || 'answer.webm')
  form.append('model', model)
  const body = await call('/audio/transcriptions', key, { method: 'POST', body: form })
  return String(body?.text ?? '').trim()
}

export async function transcribeVerbose(
  key: string,
  model: string,
  audio: File | Blob,
  fallbackFilename: string = 'answer.webm',
): Promise<RawWhisperVerboseResponse> {
  const form = new FormData()
  const name = (audio as any).name || fallbackFilename
  form.append('file', audio, name)
  form.append('model', model)
  form.append('response_format', 'verbose_json')
  form.append('timestamp_granularities[]', 'word')
  form.append('timestamp_granularities[]', 'segment')

  const body = await call('/audio/transcriptions', key, { method: 'POST', body: form })
  return {
    text: String(body?.text ?? '').trim(),
    language: body?.language ?? 'english',
    duration: typeof body?.duration === 'number' ? body.duration : undefined,
    words: Array.isArray(body?.words) ? body.words : [],
    segments: Array.isArray(body?.segments) ? body.segments : [],
  }
}

/** Responses API with a strict JSON schema; strict mode guarantees the shape. */
export async function structured<T>(
  key: string,
  model: string,
  name: string,
  schema: object,
  prompt: { system: string; user: string },
): Promise<T> {
  const body = await call('/responses', key, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      input: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
      text: { format: { type: 'json_schema', name, schema, strict: true } },
    }),
  })
  if (body?.status === 'incomplete') throw new UpstreamError('The AI response was cut off. Please try again.', 502)
  const parts = body?.output?.flatMap((o: any) => (o.type === 'message' ? o.content : [])) ?? []
  if (parts.some((c: any) => c.type === 'refusal')) throw new UpstreamError('OpenAI declined to answer this request.', 400)
  const text = parts.find((c: any) => c.type === 'output_text')?.text
  if (!text) throw new UpstreamError('OpenAI returned no usable answer. Please try again.', 502)
  try {
    return JSON.parse(text) as T
  } catch {
    // Must not escape as a SyntaxError: the error handler would blame the client's request body.
    throw new UpstreamError('OpenAI returned a malformed answer. Please try again.', 502)
  }
}
