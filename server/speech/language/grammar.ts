import type { GrammarIssue, NormalizedWord } from '../../../src/speech.ts'

export type GrammarRule = {
  id: string
  category: GrammarIssue['category']
  pattern: RegExp
  correction: (match: RegExpExecArray) => string
  explanation: string
  confidence: number
  isAsrArtifact?: boolean
}

export const RULE_BASED_GRAMMAR_CHECKS: GrammarRule[] = [
  // Subject-Verb Agreement
  {
    id: 'sva-he-have',
    category: 'SUBJECT_VERB_AGREEMENT',
    pattern: /\b(he|she|it|everyone|somebody|nobody|each)\s+(have)\b/i,
    correction: (m) => `${m[1]} has`,
    explanation: 'Singular third-person subject requires "has" instead of "have".',
    confidence: 0.95,
  },
  {
    id: 'sva-they-is',
    category: 'SUBJECT_VERB_AGREEMENT',
    pattern: /\b(they|we|you)\s+(is|was)\b/i,
    correction: (m) => `${m[1]} ${m[2].toLowerCase() === 'is' ? 'are' : 'were'}`,
    explanation: 'Plural pronoun requires plural verb form.',
    confidence: 0.95,
  },
  {
    id: 'sva-there-is-plural',
    category: 'SUBJECT_VERB_AGREEMENT',
    pattern: /\b(there\s+is)\s+([0-9]+|many|several|multiple|few)\b/i,
    correction: (m) => `there are ${m[2]}`,
    explanation: 'Plural complement requires "there are".',
    confidence: 0.85,
  },

  // Article / Preposition
  {
    id: 'art-a-vowel',
    category: 'ARTICLE_OR_PREPOSITION',
    pattern: /\b(a)\s+([aeiou][a-z]+)\b/i,
    correction: (m) => `an ${m[2]}`,
    explanation: 'Use the indefinite article "an" before vowel sounds.',
    confidence: 0.88,
    isAsrArtifact: true, // Often an ASR boundary truncation
  },
  {
    id: 'prep-different-than',
    category: 'ARTICLE_OR_PREPOSITION',
    pattern: /\b(different\s+than)\b/i,
    correction: () => 'different from',
    explanation: 'In formal explanatory speech, "different from" is preferred over "different than".',
    confidence: 0.8,
  },

  // Speech-to-Text Homophone Artifacts
  {
    id: 'asr-their-there',
    category: 'SPEECH_TO_TEXT_ARTIFACT',
    pattern: /\b(their)\s+(is|are|was|were)\b/i,
    correction: (m) => `there ${m[2]}`,
    explanation: 'Likely speech-to-text homophone artifact: transcribed "their" instead of "there".',
    confidence: 0.9,
    isAsrArtifact: true,
  },
  {
    id: 'asr-to-too',
    category: 'SPEECH_TO_TEXT_ARTIFACT',
    pattern: /\b(to)\s+(much|many|fast|slow|difficult)\b/i,
    correction: (m) => `too ${m[2]}`,
    explanation: 'Likely speech-to-text homophone artifact: transcribed "to" instead of "too".',
    confidence: 0.9,
    isAsrArtifact: true,
  },
]

export class GrammarAnalyzer {
  public analyzeText(text: string, words: NormalizedWord[]): GrammarIssue[] {
    const issues: GrammarIssue[] = []
    if (!text || words.length === 0) return issues

    for (const rule of RULE_BASED_GRAMMAR_CHECKS) {
      const regex = new RegExp(rule.pattern.source, 'gi')
      let match: RegExpExecArray | null

      while ((match = regex.exec(text)) !== null) {
        const originalText = match[0]
        const suggestedCorrection = rule.correction(match)
        const charStart = match.index
        const charEnd = charStart + originalText.length

        // Correlate character offsets to word indices
        let charAcc = 0
        let startWordIndex = 0
        let endWordIndex = 0

        for (let i = 0; i < words.length; i++) {
          const w = words[i].punctuatedText || words[i].text
          const wStart = text.indexOf(w, charAcc)
          if (wStart !== -1) {
            charAcc = wStart + w.length
            if (wStart <= charStart) startWordIndex = i
            if (charAcc >= charEnd && endWordIndex === 0) endWordIndex = i
          }
        }
        if (endWordIndex < startWordIndex) endWordIndex = startWordIndex

        issues.push({
          id: `${rule.id}-${charStart}`,
          category: rule.category,
          originalText,
          suggestedCorrection,
          explanation: rule.explanation,
          startWordIndex,
          endWordIndex,
          confidence: rule.confidence,
          isLikelyAsrArtifact: rule.isAsrArtifact ?? false,
        })
      }
    }

    return issues
  }
}
