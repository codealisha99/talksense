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

export async function transcribe(key: string, model: string, audio: File): Promise<string> {
  const form = new FormData()
  form.append('file', audio, audio.name || 'answer.webm')
  form.append('model', model)
  const body = await call('/audio/transcriptions', key, { method: 'POST', body: form })
  return String(body?.text ?? '').trim()
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
  const text = body?.output
    ?.flatMap((o: any) => (o.type === 'message' ? o.content : []))
    .find((c: any) => c.type === 'output_text')?.text
  if (!text) throw new UpstreamError('OpenAI returned no usable answer. Please try again.', 502)
  return JSON.parse(text) as T
}
