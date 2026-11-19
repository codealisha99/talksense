import type { FillerClassification } from '../../../src/speech.ts'

export type FillerEntry = {
  canonical: string
  tokens: string[] // e.g. ['you', 'know'] or ['um']
  unconditionalFiller: boolean // true for 'um', 'uh', 'er', 'erm', 'hmm'
  discourseMarkerCandidate: boolean // e.g. 'basically', 'actually', 'literally'
  requiresContextDisambiguation: boolean // true for 'like', 'well', 'so', 'mean'
}

export const FILLER_DICTIONARY: FillerEntry[] = [
  // 1. Unvoiced non-lexical fillers (almost always true fillers in monologue/sprint)
  { canonical: 'um', tokens: ['um'], unconditionalFiller: true, discourseMarkerCandidate: false, requiresContextDisambiguation: false },
  { canonical: 'uh', tokens: ['uh'], unconditionalFiller: true, discourseMarkerCandidate: false, requiresContextDisambiguation: false },
  { canonical: 'er', tokens: ['er'], unconditionalFiller: true, discourseMarkerCandidate: false, requiresContextDisambiguation: false },
  { canonical: 'erm', tokens: ['erm'], unconditionalFiller: true, discourseMarkerCandidate: false, requiresContextDisambiguation: false },
  { canonical: 'hmm', tokens: ['hmm'], unconditionalFiller: true, discourseMarkerCandidate: false, requiresContextDisambiguation: false },
  { canonical: 'ah', tokens: ['ah'], unconditionalFiller: true, discourseMarkerCandidate: false, requiresContextDisambiguation: false },

  // 2. Multi-word phrases
  { canonical: 'you know', tokens: ['you', 'know'], unconditionalFiller: false, discourseMarkerCandidate: true, requiresContextDisambiguation: true },
  { canonical: 'i mean', tokens: ['i', 'mean'], unconditionalFiller: false, discourseMarkerCandidate: true, requiresContextDisambiguation: true },
  { canonical: 'sort of', tokens: ['sort', 'of'], unconditionalFiller: false, discourseMarkerCandidate: true, requiresContextDisambiguation: true },
  { canonical: 'kind of', tokens: ['kind', 'of'], unconditionalFiller: false, discourseMarkerCandidate: true, requiresContextDisambiguation: true },
  { canonical: 'you see', tokens: ['you', 'see'], unconditionalFiller: false, discourseMarkerCandidate: true, requiresContextDisambiguation: true },
  { canonical: 'i guess', tokens: ['i', 'guess'], unconditionalFiller: false, discourseMarkerCandidate: true, requiresContextDisambiguation: true },

  // 3. Single-word discourse / hedge words requiring syntactic disambiguation
  { canonical: 'like', tokens: ['like'], unconditionalFiller: false, discourseMarkerCandidate: true, requiresContextDisambiguation: true },
  { canonical: 'basically', tokens: ['basically'], unconditionalFiller: false, discourseMarkerCandidate: true, requiresContextDisambiguation: true },
  { canonical: 'actually', tokens: ['actually'], unconditionalFiller: false, discourseMarkerCandidate: true, requiresContextDisambiguation: true },
  { canonical: 'literally', tokens: ['literally'], unconditionalFiller: false, discourseMarkerCandidate: true, requiresContextDisambiguation: true },
  { canonical: 'so', tokens: ['so'], unconditionalFiller: false, discourseMarkerCandidate: true, requiresContextDisambiguation: true },
  { canonical: 'well', tokens: ['well'], unconditionalFiller: false, discourseMarkerCandidate: true, requiresContextDisambiguation: true },
  { canonical: 'right', tokens: ['right'], unconditionalFiller: false, discourseMarkerCandidate: true, requiresContextDisambiguation: true },
]
