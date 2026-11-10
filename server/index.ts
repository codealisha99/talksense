import { readFile } from 'node:fs/promises'
import { Hono, type Context, type MiddlewareHandler } from 'hono'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { getConnInfo } from '@hono/node-server/conninfo'
import { z } from 'zod'
import { migrate, sql } from './db.ts'
import { structured, transcribe, UpstreamError } from './openai.ts'
import {
  BRIEF_SCHEMA, DURATIONS, GRADE_SCHEMA, MAX_TOPIC_LENGTH, MIN_ANSWER_WORDS, briefPrompt, gradePrompt,
  levelFor, totalScore, wordCount, type Brief, type Grade, type HistoryItem, type PublicResult,
} from '../src/rubric.ts'
import { NICHES, RANDOM_TOPIC_SCHEMA, randomTopicPrompt, type RandomTopic } from '../src/topics.ts'

const PORT = Number(process.env.PORT ?? 3000)
const CHAT_MODEL = process.env.CHAT_MODEL ?? 'gpt-6-astra'
const TRANSCRIBE_MODEL = process.env.TRANSCRIBE_MODEL ?? 'gpt-transcribe'
const TOPIC_MODEL = process.env.TOPIC_MODEL ?? 'gpt-6-luna' // short creative task: fast, cheap model is enough
const AVOID_RECENT_TOPICS = 25
const MAX_AUDIO_BYTES = 25 * 1024 * 1024 // OpenAI's upload limit
const MAX_TEXT_CHARS = 20_000

class HttpError extends Error {
  status: 400 | 404 | 409 | 413 | 422 | 429
  constructor(status: HttpError['status'], message: string) {
    super(message)
    this.status = status
  }
}

// ---------- validation ----------

const uuid = z.uuid()
const openAiKey = z.string().regex(/^sk-[\w-]{20,300}$/, 'Add a valid OpenAI API key in settings.')
const createBody = z.object({
  deviceId: uuid,
  topic: z.string().trim().min(2, 'Topic is too short.').max(MAX_TOPIC_LENGTH),
  minutes: z.literal(DURATIONS),
})
const deviceBody = z.object({ deviceId: uuid })
const textBody = deviceBody.extend({ text: z.string().max(MAX_TEXT_CHARS) })
const randomTopicBody = deviceBody.extend({ niche: z.enum(NICHES).nullable().default(null) })

const keyOf = (c: Context) => openAiKey.parse(c.req.header('x-openai-key') ?? '')
const idOf = (c: Context) => {
  const parsed = uuid.safeParse(c.req.param('id'))
  if (!parsed.success) throw new HttpError(404, 'Session not found.')
  return parsed.data
}

// ---------- rate limiting ----------

// ponytail: in-memory, per instance. Move to Postgres/Redis if we ever run more than one replica.
const hits = new Map<string, { count: number; reset: number }>()
function rateLimit(limit: number, windowMs: number): MiddlewareHandler {
  return async (c, next) => {
    const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || getConnInfo(c).remote.address || 'unknown'
    const now = Date.now()
    const entry = hits.get(ip)
    const current = entry && entry.reset > now ? { ...entry, count: entry.count + 1 } : { count: 1, reset: now + windowMs }
    hits.set(ip, current)
    if (current.count > limit) throw new HttpError(429, 'Too many requests. Take a breath and try again in a few minutes.')
    await next()
  }
}
setInterval(() => {
  const now = Date.now()
  for (const [ip, e] of hits) if (e.reset <= now) hits.delete(ip)
}, 60_000).unref()

// ---------- helpers ----------

type Row = Record<string, any>

async function ownedSession(id: string, deviceId: string): Promise<Row> {
  const [row] = await sql`SELECT * FROM sessions WHERE id = ${id} AND device_id = ${deviceId}`
  if (!row) throw new HttpError(404, 'Session not found.')
  return row
}

function toPublic(row: Row): PublicResult {
  return {
    id: row.id,
    topic: row.topic,
    minutes: row.minutes,
    studiedMinutes: row.studied_minutes,
    score: row.score,
    level: row.level,
    grade: row.grade,
    gradedAt: new Date(row.graded_at).toISOString(),
  }
}

// ---------- API ----------

const api = new Hono()
api.use('*', async (c, next) => {
  await next()
  c.header('Cache-Control', 'no-store')
})
api.post('*', rateLimit(40, 10 * 60_000))

api.post('/sessions', async (c) => {
  const key = keyOf(c)
  const { deviceId, topic, minutes } = createBody.parse(await c.req.json())
  const brief = await structured<Brief>(key, CHAT_MODEL, 'brief', BRIEF_SCHEMA, briefPrompt(topic, minutes))
  const [row] = await sql`
    INSERT INTO sessions (device_id, topic, minutes, brief)
    VALUES (${deviceId}, ${topic}, ${minutes}, ${JSON.stringify(brief)})
    RETURNING id`
  return c.json({ data: { id: row.id, brief } })
})

api.post('/topics/random', async (c) => {
  const key = keyOf(c)
  const { deviceId, niche } = randomTopicBody.parse(await c.req.json())
  const recent = await sql`SELECT topic FROM sessions WHERE device_id = ${deviceId} ORDER BY created_at DESC LIMIT ${AVOID_RECENT_TOPICS}`
  const { area, prompt } = randomTopicPrompt(niche, recent.map((r) => r.topic))
  const idea = await structured<RandomTopic>(key, TOPIC_MODEL, 'random_topic', RANDOM_TOPIC_SCHEMA, prompt)
  const topic = idea.topic.trim().slice(0, MAX_TOPIC_LENGTH)
  if (topic.length < 2) throw new UpstreamError('OpenAI returned an empty idea. Roll again.', 502)
  return c.json({ data: { topic, hook: idea.hook.trim(), niche: area } })
})

api.post('/sessions/:id/start', async (c) => {
  const { deviceId } = deviceBody.parse(await c.req.json())
  const [row] = await sql`
    UPDATE sessions SET started_at = COALESCE(started_at, now())
    WHERE id = ${idOf(c)} AND device_id = ${deviceId}
    RETURNING started_at`
  if (!row) throw new HttpError(404, 'Session not found.')
  return c.json({ data: { startedAt: new Date(row.started_at).toISOString() } })
})

// Step 1: audio (multipart) or typed text (JSON) -> stored transcript.
api.post('/sessions/:id/transcript', async (c) => {
  const id = idOf(c)
  let deviceId: string
  let transcript: string
  if (c.req.header('content-type')?.startsWith('multipart/form-data')) {
    const form = await c.req.parseBody()
    deviceId = deviceBody.parse({ deviceId: form.deviceId }).deviceId
    const audio = form.audio
    if (!(audio instanceof File) || audio.size === 0) throw new HttpError(400, 'No audio received. Try recording again.')
    if (audio.size > MAX_AUDIO_BYTES) throw new HttpError(413, 'That recording is too long. Keep it under 10 minutes.')
    const key = keyOf(c)
    const session = await ownedSession(id, deviceId)
    if (session.grade) throw new HttpError(409, 'This session has already been rated.')
    transcript = await transcribe(key, TRANSCRIBE_MODEL, audio)
  } else {
    const body = textBody.parse(await c.req.json())
    deviceId = body.deviceId
    transcript = body.text.trim()
    const session = await ownedSession(id, deviceId)
    if (session.grade) throw new HttpError(409, 'This session has already been rated.')
  }
  const words = wordCount(transcript)
  if (words < MIN_ANSWER_WORDS) {
    throw new HttpError(422, `We only caught ${words} word${words === 1 ? '' : 's'}. Explain in more detail (at least ${MIN_ANSWER_WORDS}) and try again.`)
  }
  await sql`UPDATE sessions SET transcript = ${transcript} WHERE id = ${id} AND device_id = ${deviceId} AND grade IS NULL`
  return c.json({ data: { transcript } })
})

// Step 2: grade the stored transcript. Score is computed here, so shared results can't be forged by the client.
api.post('/sessions/:id/grade', async (c) => {
  const key = keyOf(c)
  const id = idOf(c)
  const { deviceId } = deviceBody.parse(await c.req.json())
  const session = await ownedSession(id, deviceId)
  if (session.grade) throw new HttpError(409, 'This session has already been rated.')
  if (!session.transcript) throw new HttpError(400, 'Record your explanation first.')

  const grade = await structured<Grade>(key, CHAT_MODEL, 'grade', GRADE_SCHEMA, gradePrompt(session.topic, session.brief, session.transcript))
  const score = totalScore(grade.dimensions)
  const studied = session.started_at ? Math.max(1, Math.round((Date.now() - new Date(session.started_at).getTime()) / 60_000)) : null
  const [row] = await sql`
    UPDATE sessions
    SET grade = ${JSON.stringify(grade)}, score = ${score}, level = ${levelFor(score)},
        studied_minutes = ${studied}, graded_at = now()
    WHERE id = ${id} AND device_id = ${deviceId} AND grade IS NULL
    RETURNING *`
  if (!row) throw new HttpError(409, 'This session has already been rated.')
  return c.json({ data: toPublic(row) })
})

api.get('/results/:id', async (c) => {
  const [row] = await sql`SELECT * FROM sessions WHERE id = ${idOf(c)} AND grade IS NOT NULL`
  if (!row) throw new HttpError(404, 'Result not found.')
  return c.json({ data: toPublic(row) })
})

api.get('/devices/:deviceId/history', async (c) => {
  const deviceId = uuid.parse(c.req.param('deviceId'))
  const rows = await sql`
    SELECT id, topic, minutes, score, level, graded_at FROM sessions
    WHERE device_id = ${deviceId} AND grade IS NOT NULL
    ORDER BY graded_at DESC LIMIT 200`
  const data: HistoryItem[] = rows.map((r) => ({
    id: r.id, topic: r.topic, minutes: r.minutes, score: r.score, level: r.level, gradedAt: new Date(r.graded_at).toISOString(),
  }))
  return c.json({ data })
})

// ---------- app ----------

const app = new Hono()
app.route('/api', api)
app.get('/healthz', (c) => c.text('ok'))

app.onError((err, c) => {
  if (err instanceof HttpError || err instanceof UpstreamError) return c.json({ error: err.message }, err.status)
  if (err instanceof z.ZodError) return c.json({ error: err.issues[0]?.message ?? 'Invalid request.' }, 400)
  if (err instanceof SyntaxError) return c.json({ error: 'Malformed request body.' }, 400)
  console.error(`[${c.req.method} ${c.req.path}]`, err)
  return c.json({ error: 'Something went wrong on our side. Please try again.' }, 500)
})

// Static client + share pages with Open Graph tags so X/LinkedIn show a rich preview.
let indexHtml: string | null = null
const loadIndex = async () => (indexHtml ??= await readFile('./dist/index.html', 'utf8'))
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`)

app.get('/r/:id', async (c) => {
  const html = await loadIndex()
  const id = uuid.safeParse(c.req.param('id'))
  const [row] = id.success ? await sql`SELECT topic, score, level FROM sessions WHERE id = ${id.data} AND grade IS NOT NULL` : []
  if (!row) return c.html(html, 404)
  const title = escapeHtml(`${row.score}/100 on “${row.topic}” · Talksense`)
  const desc = escapeHtml(`Studied it, then explained it out loud. Rated ${row.level}. Can you beat it?`)
  const meta = [
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${desc}">`,
    `<meta property="og:type" content="article">`,
    `<meta property="og:url" content="${escapeHtml(c.req.url)}">`,
    `<meta name="twitter:card" content="summary">`,
    `<meta name="twitter:title" content="${title}">`,
    `<meta name="twitter:description" content="${desc}">`,
    `<meta name="description" content="${desc}">`,
  ].join('')
  return c.html(html.replace('<title>Talksense</title>', `<title>${title}</title>${meta}`))
})

app.use('/*', serveStatic({ root: './dist' }))
app.get('*', async (c) => c.html(await loadIndex()))

await migrate()
serve({ fetch: app.fetch, port: PORT }, (info) => console.info(`talksense listening on :${info.port}`))
