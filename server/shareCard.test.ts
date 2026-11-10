import { test } from 'node:test'
import assert from 'node:assert/strict'
import { escapeXml, shareCardSvg, wrap } from './shareCard.ts'

test('wrap respects the character budget and line limit', () => {
  assert.deepEqual(wrap('one two three four', 9, 3), ['one two', 'three', 'four'])
  assert.deepEqual(wrap('aaaa bbbb cccc dddd', 9, 1), ['aaaa bbb…'])
  assert.deepEqual(wrap('aa bb cc', 20, 1), ['aa bb cc'])
  assert.deepEqual(wrap('  ', 10, 2), [])
  assert.ok(wrap('x'.repeat(40), 10, 2).every((l) => l.length <= 10))
})

test('escapes user text so the SVG cannot be broken or injected into', () => {
  assert.equal(escapeXml(`<a href="x">&'`), '&lt;a href=&quot;x&quot;&gt;&amp;&apos;')
  const svg = shareCardSvg({
    topic: 'Why </text><script>alert(1)</script> matters',
    score: 76, level: 'Expert', minutes: 20, studiedMinutes: 18,
    dimensions: { coverage: { score: 3 }, accuracy: { score: 4 }, depth: { score: 2 }, clarity: { score: 9 } },
  })
  assert.ok(!svg.includes('<script>'))
  assert.ok(svg.includes('>76<'))
  assert.ok(svg.includes('STUDIED 18 MIN'))
})
