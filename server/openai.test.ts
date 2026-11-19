import { test } from 'node:test'
import assert from 'node:assert/strict'
import { structured, UpstreamError } from './openai.ts'

const reply = (body: unknown) => async () => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
const message = (content: unknown[]) => ({ status: 'completed', output: [{ type: 'message', content }] })
const call = () => structured<{ a: number }>('sk-test', 'm', 'n', {}, { system: 's', user: 'u' })

test('parses a completed structured reply', async (t) => {
  t.mock.method(globalThis, 'fetch', reply(message([{ type: 'output_text', text: '{"a":1}' }])))
  assert.deepEqual(await call(), { a: 1 })
})

test('a truncated (incomplete) reply is an upstream error, not a client SyntaxError', async (t) => {
  t.mock.method(globalThis, 'fetch', reply({ ...message([{ type: 'output_text', text: '{"a":' }]), status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' } }))
  await assert.rejects(call(), (e) => e instanceof UpstreamError && e.status === 502)
})

test('unparseable text is an upstream error', async (t) => {
  t.mock.method(globalThis, 'fetch', reply(message([{ type: 'output_text', text: 'not json' }])))
  await assert.rejects(call(), (e) => e instanceof UpstreamError && e.status === 502)
})

test('a refusal is reported as a refusal', async (t) => {
  t.mock.method(globalThis, 'fetch', reply(message([{ type: 'refusal', refusal: 'I cannot help with that.' }])))
  await assert.rejects(call(), (e) => e instanceof UpstreamError && /declined/i.test(e.message))
})

test('transcribeVerbose parses word timestamps and duration from verbose_json', async (t) => {
  const { transcribeVerbose } = await import('./openai.ts')
  const verboseData = {
    task: 'transcribe',
    language: 'english',
    duration: 5.4,
    text: 'Hello world',
    words: [
      { word: 'Hello', start: 0.1, end: 0.5 },
      { word: 'world', start: 0.6, end: 1.1 },
    ],
  }
  t.mock.method(globalThis, 'fetch', reply(verboseData))
  const dummyFile = new File(['dummy'], 'test.webm', { type: 'audio/webm' })
  const result = await transcribeVerbose('sk-test', 'gpt-transcribe', dummyFile)

  assert.equal(result.text, 'Hello world')
  assert.equal(result.duration, 5.4)
  assert.equal(result.words?.length, 2)
  assert.equal(result.words?.[0].word, 'Hello')
  assert.equal(result.words?.[1].end, 1.1)
})
