// Random "surprise me" topics. Randomness comes from code (area x angle), not from the model,
// because models asked for "something random" keep returning the same handful of ideas.

export const NICHES = [
  'Cooking', 'Coding', 'Games', 'Music', 'Science', 'History',
  'Money', 'Health', 'Space', 'Psychology', 'Art & design', 'Sports',
] as const
export type Niche = (typeof NICHES)[number]

export const ANGLES = [
  'a surprising everyday phenomenon and why it happens',
  'how one specific thing actually works under the hood',
  'a turning point and what changed because of it',
  'a counterintuitive idea most people get wrong',
  'a concrete technique or skill and why it works',
  'a real debate with two reasonable sides',
  'a "what would happen if" question with a real answer',
  'a famous mistake or failure and its lesson',
  'a hidden pattern or rule behind something familiar',
] as const

export type RandomTopic = { topic: string; hook: string }

export const RANDOM_TOPIC_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['topic', 'hook'],
  properties: { topic: { type: 'string' }, hook: { type: 'string' } },
}

const pick = <T>(items: readonly T[], random: () => number): T => items[Math.floor(random() * items.length) % items.length]

export function randomTopicPrompt(niche: Niche | null, avoid: string[], random: () => number = Math.random) {
  const area = niche ?? pick(NICHES, random)
  const angle = pick(ANGLES, random)
  const avoidList = avoid.length ? `\nDo not repeat or closely paraphrase any of these:\n${avoid.map((t) => `- ${t}`).join('\n')}` : ''
  return {
    area,
    prompt: {
      system:
        'You suggest ONE specific thing a curious adult could learn in 15-30 minutes and then explain out loud. ' +
        'It can be a question, a phenomenon, a technique, an event or an idea, but never a single broad word ' +
        '(not "Music" but "Why minor chords sound sad"). Keep the topic under 90 characters, concrete, and ' +
        'phrased naturally. The hook is one short, honest sentence on why it is interesting. No clickbait, no emoji.',
      user: `Area: ${area}\nAngle: ${angle}${avoidList}`,
    },
  }
}
