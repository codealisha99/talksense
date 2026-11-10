// Bring-your-own-key: calls go straight from the browser to OpenAI with the user's key.
const BASE = 'https://api.openai.com/v1'

async function call(path: string, key: string, init: RequestInit): Promise<any> {
  let res: Response
  try {
    res = await fetch(BASE + path, { ...init, headers: { Authorization: `Bearer ${key}`, ...init.headers } })
  } catch {
    throw new Error('Could not reach OpenAI. Check your connection and try again.')
  }
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401) throw new Error('OpenAI rejected your API key. Update it in Settings.')
    if (res.status === 429) throw new Error('OpenAI rate limit or quota hit on your key. Wait a bit or check billing.')
    throw new Error(`OpenAI error (${res.status}): ${body?.error?.message ?? res.statusText}`)
  }
  return body
}

export async function transcribe(key: string, model: string, audio: Blob): Promise<string> {
  const ext = audio.type.includes('mp4') ? 'mp4' : audio.type.includes('ogg') ? 'ogg' : 'webm'
  const form = new FormData()
  form.append('file', audio, `answer.${ext}`)
  form.append('model', model)
  const body = await call('/audio/transcriptions', key, { method: 'POST', body: form })
  return String(body?.text ?? '').trim()
}

/** Responses API with a strict JSON schema; strict mode is what validates the shape. */
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
  if (!text) throw new Error('OpenAI returned no usable answer. Please try again.')
  return JSON.parse(text) as T
}
