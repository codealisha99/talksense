import { DIMENSIONS, type PublicResult } from '../src/rubric.ts'

// 1200x630 Open Graph card, drawn as SVG then rasterised (X and LinkedIn don't accept SVG).
export const CARD_W = 1200
export const CARD_H = 630

const PAPER = '#f3f0e8'
const CARD = '#faf8f3'
const INK = '#161513'
const MUTED = '#8a857a'
const LINE = '#d9d3c5'
const SIGNAL = '#ea580c'

export const escapeXml = (s: string) =>
  s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[ch]!)

/** Greedy word wrap by character budget; overflow is cut with an ellipsis on the last line. */
export function wrap(text: string, maxChars: number, maxLines: number): string[] {
  const lines: string[] = []
  let current = ''
  for (const word of text.trim().split(/\s+/)) {
    const piece = word.length > maxChars ? `${word.slice(0, maxChars - 1)}…` : word
    if (!current) current = piece
    else if (current.length + 1 + piece.length <= maxChars) current += ` ${piece}`
    else {
      lines.push(current)
      current = piece
    }
  }
  if (current) lines.push(current)
  if (lines.length <= maxLines) return lines
  const kept = lines.slice(0, maxLines)
  const last = kept[maxLines - 1]
  kept[maxLines - 1] = `${last.length >= maxChars ? last.slice(0, maxChars - 1) : last}…`
  return kept
}

// Geist Mono at 22px advances ~13.2px per glyph, plus 5px letter-spacing.
const STAMP_CHAR_W = 18.2
const STAMP_PADDING = 44
const STAMP_CX = 900
export const stampWidth = (level: string) => Math.round(level.length * STAMP_CHAR_W + STAMP_PADDING)

type CardInput = Pick<PublicResult, 'topic' | 'score' | 'level' | 'minutes' | 'studiedMinutes'> & {
  dimensions: Record<string, { score: number }>
}

export function shareCardSvg(r: CardInput): string {
  const topicSize = r.topic.length > 60 ? 54 : 64
  const lines = wrap(r.topic, topicSize === 64 ? 24 : 29, 3)
  const topic = lines
    .map((line, i) => `<text x="72" y="${222 + i * topicSize * 1.05}" font-family="Instrument Serif" font-size="${topicSize}" fill="${INK}">${escapeXml(line)}</text>`)
    .join('')

  const bars = DIMENSIONS.map((d, row) => {
    const y = 470 + row * 30
    const s = Math.max(0, Math.min(4, Math.round(r.dimensions[d.id]?.score ?? 0)))
    const cells = [0, 1, 2, 3]
      .map((c) => `<rect x="${232 + c * 34}" y="${y - 12}" width="30" height="12" rx="2.5" fill="${c < s ? INK : PAPER}" stroke="${c < s ? INK : LINE}"/>`)
      .join('')
    return `<text x="72" y="${y}" font-family="Geist Mono" font-size="15" letter-spacing="1.5" fill="${MUTED}">${d.label.toUpperCase()}</text>${cells}`
  }).join('')

  const minutes = r.studiedMinutes ?? r.minutes
  const stampW = stampWidth(r.level)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}">
  <rect width="${CARD_W}" height="${CARD_H}" fill="${PAPER}"/>
  <rect x="24" y="24" width="${CARD_W - 48}" height="${CARD_H - 48}" rx="28" fill="${CARD}" stroke="${LINE}" stroke-width="1.5"/>
  <circle cx="80" cy="86" r="7" fill="${SIGNAL}"/>
  <text x="96" y="96" font-family="Instrument Serif" font-style="italic" font-size="34" fill="${INK}">talksense</text>
  <text x="72" y="136" font-family="Geist Mono" font-size="15" letter-spacing="2.5" fill="${MUTED}">STUDIED ${minutes} MIN · EXPLAINED IT OUT LOUD</text>
  ${topic}
  <line x1="72" y1="430" x2="420" y2="430" stroke="${LINE}"/>
  ${bars}
  <text x="1110" y="470" text-anchor="end" font-family="Instrument Serif" font-size="300" letter-spacing="-12" fill="${INK}">${r.score}</text>
  <text x="1112" y="530" text-anchor="end" font-family="Geist Mono" font-size="18" fill="${MUTED}">/100</text>
  <g transform="rotate(-5 ${STAMP_CX} 548)">
    <rect x="${STAMP_CX - stampW / 2}" y="522" width="${stampW}" height="52" rx="7" fill="none" stroke="${SIGNAL}" stroke-width="2.5"/>
    <rect x="${STAMP_CX - stampW / 2 - 6}" y="516" width="${stampW + 12}" height="64" rx="10" fill="none" stroke="${SIGNAL}" stroke-width="1.5"/>
    <text x="${STAMP_CX}" y="557" text-anchor="middle" font-family="Geist Mono" font-weight="600" font-size="22" letter-spacing="5" fill="${SIGNAL}">${escapeXml(r.level.toUpperCase())}</text>
  </g>
</svg>`
}
