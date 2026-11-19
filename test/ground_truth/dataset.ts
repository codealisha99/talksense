import type { NormalizedTranscript, FillerClassification } from '../../src/speech.ts'

export type GroundTruthSample = {
  id: string
  name: string
  transcript: NormalizedTranscript
  expected: {
    fillers: Array<{
      token: string
      classification: FillerClassification
      startIndex: number
    }>
    pace: {
      minWpm: number
      maxWpm: number
      tempoStatus: 'VERY_SLOW' | 'SLOW' | 'MODERATE' | 'FAST' | 'VERY_FAST'
    }
    pauses: {
      minCount: number
      expectedHesitationCount: number
    }
    repetitions: {
      minCount: number
      types?: string[]
    }
    grammar: {
      minIssues: number
    }
  }
}

export const GROUND_TRUTH_DATASET: GroundTruthSample[] = [
  {
    id: 'sample-01-clean-fluent',
    name: 'Clean and fluent technical explanation',
    transcript: {
      text: 'Distributed hash tables provide decentralized lookup services similar to a hash table.',
      durationSeconds: 5.0,
      language: 'en',
      provider: 'openai-whisper',
      words: [
        { text: 'Distributed', start: 0.1, end: 0.8, confidence: 0.98, punctuatedText: 'Distributed' },
        { text: 'hash', start: 0.85, end: 1.15, confidence: 0.99, punctuatedText: 'hash' },
        { text: 'tables', start: 1.2, end: 1.6, confidence: 0.97, punctuatedText: 'tables' },
        { text: 'provide', start: 1.65, end: 2.1, confidence: 0.96, punctuatedText: 'provide' },
        { text: 'decentralized', start: 2.15, end: 2.9, confidence: 0.99, punctuatedText: 'decentralized' },
        { text: 'lookup', start: 2.95, end: 3.35, confidence: 0.95, punctuatedText: 'lookup' },
        { text: 'services', start: 3.4, end: 3.85, confidence: 0.98, punctuatedText: 'services' },
        { text: 'similar', start: 3.9, end: 4.25, confidence: 0.94, punctuatedText: 'similar' },
        { text: 'to', start: 4.3, end: 4.4, confidence: 0.97, punctuatedText: 'to' },
        { text: 'a', start: 4.45, end: 4.5, confidence: 0.99, punctuatedText: 'a' },
        { text: 'hash', start: 4.55, end: 4.75, confidence: 0.98, punctuatedText: 'hash' },
        { text: 'table', start: 4.8, end: 5.1, confidence: 0.99, punctuatedText: 'table.' },
      ],
    },
    expected: {
      fillers: [],
      pace: {
        minWpm: 120,
        maxWpm: 160,
        tempoStatus: 'MODERATE',
      },
      pauses: {
        minCount: 0,
        expectedHesitationCount: 0,
      },
      repetitions: {
        minCount: 0,
      },
      grammar: {
        minIssues: 0,
      },
    },
  },
  {
    id: 'sample-02-excessive-fillers',
    name: 'Frequent filler words and hesitation pauses',
    transcript: {
      text: 'Um, so basically, uh, neural networks are, you know, kind of like biological brains.',
      durationSeconds: 8.0,
      language: 'en',
      provider: 'openai-whisper',
      words: [
        { text: 'Um', start: 0.2, end: 0.6, confidence: 0.91, punctuatedText: 'Um,' },
        { text: 'so', start: 1.2, end: 1.5, confidence: 0.89, punctuatedText: 'so' },
        { text: 'basically', start: 1.6, end: 2.3, confidence: 0.92, punctuatedText: 'basically,' },
        { text: 'uh', start: 3.0, end: 3.4, confidence: 0.88, punctuatedText: 'uh,' },
        { text: 'neural', start: 3.5, end: 3.9, confidence: 0.96, punctuatedText: 'neural' },
        { text: 'networks', start: 3.95, end: 4.5, confidence: 0.97, punctuatedText: 'networks' },
        { text: 'are', start: 4.55, end: 4.7, confidence: 0.95, punctuatedText: 'are,' },
        { text: 'you', start: 5.4, end: 5.6, confidence: 0.92, punctuatedText: 'you' },
        { text: 'know', start: 5.65, end: 5.9, confidence: 0.93, punctuatedText: 'know,' },
        { text: 'kind', start: 6.0, end: 6.2, confidence: 0.9, punctuatedText: 'kind' },
        { text: 'of', start: 6.25, end: 6.4, confidence: 0.91, punctuatedText: 'of' },
        { text: 'like', start: 6.45, end: 6.7, confidence: 0.89, punctuatedText: 'like' },
        { text: 'biological', start: 6.75, end: 7.3, confidence: 0.98, punctuatedText: 'biological' },
        { text: 'brains', start: 7.35, end: 7.8, confidence: 0.97, punctuatedText: 'brains.' },
      ],
    },
    expected: {
      fillers: [
        { token: 'Um', classification: 'CONFIRMED_FILLER', startIndex: 0 },
        { token: 'basically', classification: 'DISCOURSE_MARKER', startIndex: 2 },
        { token: 'uh', classification: 'CONFIRMED_FILLER', startIndex: 3 },
        { token: 'you know', classification: 'DISCOURSE_MARKER', startIndex: 7 },
        { token: 'kind of', classification: 'DISCOURSE_MARKER', startIndex: 9 },
      ],
      pace: {
        minWpm: 90,
        maxWpm: 130,
        tempoStatus: 'SLOW',
      },
      pauses: {
        minCount: 3,
        expectedHesitationCount: 2,
      },
      repetitions: {
        minCount: 0,
      },
      grammar: {
        minIssues: 0,
      },
    },
  },
  {
    id: 'sample-03-meaningful-ambiguous-words',
    name: 'Disambiguation of "like" and "actually" in grammatical context',
    transcript: {
      text: 'Algorithms like quicksort actually perform very well in practical benchmark tests.',
      durationSeconds: 5.0,
      language: 'en',
      provider: 'openai-whisper',
      words: [
        { text: 'Algorithms', start: 0.2, end: 0.8, confidence: 0.97, punctuatedText: 'Algorithms' },
        { text: 'like', start: 0.85, end: 1.1, confidence: 0.95, punctuatedText: 'like' },
        { text: 'quicksort', start: 1.15, end: 1.7, confidence: 0.93, punctuatedText: 'quicksort' },
        { text: 'actually', start: 1.75, end: 2.2, confidence: 0.94, punctuatedText: 'actually' },
        { text: 'perform', start: 2.25, end: 2.7, confidence: 0.98, punctuatedText: 'perform' },
        { text: 'very', start: 2.75, end: 3.0, confidence: 0.96, punctuatedText: 'very' },
        { text: 'well', start: 3.05, end: 3.3, confidence: 0.97, punctuatedText: 'well' },
        { text: 'in', start: 3.35, end: 3.45, confidence: 0.99, punctuatedText: 'in' },
        { text: 'practical', start: 3.5, end: 4.0, confidence: 0.96, punctuatedText: 'practical' },
        { text: 'benchmark', start: 4.05, end: 4.5, confidence: 0.95, punctuatedText: 'benchmark' },
        { text: 'tests', start: 4.55, end: 4.9, confidence: 0.98, punctuatedText: 'tests.' },
      ],
    },
    expected: {
      fillers: [
        // "like" as preposition here should be MEANINGFUL_USAGE
        { token: 'like', classification: 'MEANINGFUL_USAGE', startIndex: 1 },
      ],
      pace: {
        minWpm: 120,
        maxWpm: 160,
        tempoStatus: 'MODERATE',
      },
      pauses: {
        minCount: 0,
        expectedHesitationCount: 0,
      },
      repetitions: {
        minCount: 0,
      },
      grammar: {
        minIssues: 0,
      },
    },
  },
  {
    id: 'sample-04-stutter-and-restarts',
    name: 'Consecutive stutters and multi-word phrase restart',
    transcript: {
      text: 'We we we need to build, we need to build an indexing system.',
      durationSeconds: 5.5,
      language: 'en',
      provider: 'openai-whisper',
      words: [
        { text: 'We', start: 0.2, end: 0.4, confidence: 0.92, punctuatedText: 'We' },
        { text: 'we', start: 0.45, end: 0.65, confidence: 0.9, punctuatedText: 'we' },
        { text: 'we', start: 0.7, end: 0.9, confidence: 0.91, punctuatedText: 'we' },
        { text: 'need', start: 0.95, end: 1.2, confidence: 0.96, punctuatedText: 'need' },
        { text: 'to', start: 1.25, end: 1.35, confidence: 0.97, punctuatedText: 'to' },
        { text: 'build', start: 1.4, end: 1.7, confidence: 0.95, punctuatedText: 'build,' },
        { text: 'we', start: 2.4, end: 2.6, confidence: 0.94, punctuatedText: 'we' },
        { text: 'need', start: 2.65, end: 2.9, confidence: 0.96, punctuatedText: 'need' },
        { text: 'to', start: 2.95, end: 3.1, confidence: 0.97, punctuatedText: 'to' },
        { text: 'build', start: 3.15, end: 3.5, confidence: 0.96, punctuatedText: 'build' },
        { text: 'an', start: 3.55, end: 3.7, confidence: 0.98, punctuatedText: 'an' },
        { text: 'indexing', start: 3.75, end: 4.3, confidence: 0.95, punctuatedText: 'indexing' },
        { text: 'system', start: 4.35, end: 4.9, confidence: 0.98, punctuatedText: 'system.' },
      ],
    },
    expected: {
      fillers: [],
      pace: {
        minWpm: 120,
        maxWpm: 170,
        tempoStatus: 'MODERATE',
      },
      pauses: {
        minCount: 1,
        expectedHesitationCount: 1,
      },
      repetitions: {
        minCount: 2, // 1 lexical stutter ("we we we"), 1 phrase restart ("we need to build")
        types: ['LEXICAL_CONSECUTIVE', 'LEXICAL_RESTART'],
      },
      grammar: {
        minIssues: 0,
      },
    },
  },
  {
    id: 'sample-05-grammar-subject-verb-agreement',
    name: 'Spoken grammar flaw (subject-verb disagreement)',
    transcript: {
      text: 'The server response times is completely unacceptable for high traffic workloads.',
      durationSeconds: 4.8,
      language: 'en',
      provider: 'openai-whisper',
      words: [
        { text: 'The', start: 0.1, end: 0.3, confidence: 0.97, punctuatedText: 'The' },
        { text: 'server', start: 0.35, end: 0.7, confidence: 0.98, punctuatedText: 'server' },
        { text: 'response', start: 0.75, end: 1.2, confidence: 0.96, punctuatedText: 'response' },
        { text: 'times', start: 1.25, end: 1.6, confidence: 0.95, punctuatedText: 'times' },
        { text: 'is', start: 1.65, end: 1.85, confidence: 0.98, punctuatedText: 'is' },
        { text: 'completely', start: 1.9, end: 2.5, confidence: 0.97, punctuatedText: 'completely' },
        { text: 'unacceptable', start: 2.55, end: 3.3, confidence: 0.99, punctuatedText: 'unacceptable' },
        { text: 'for', start: 3.35, end: 3.5, confidence: 0.98, punctuatedText: 'for' },
        { text: 'high', start: 3.55, end: 3.8, confidence: 0.96, punctuatedText: 'high' },
        { text: 'traffic', start: 3.85, end: 4.2, confidence: 0.97, punctuatedText: 'traffic' },
        { text: 'workloads', start: 4.25, end: 4.8, confidence: 0.98, punctuatedText: 'workloads.' },
      ],
    },
    expected: {
      fillers: [],
      pace: {
        minWpm: 120,
        maxWpm: 160,
        tempoStatus: 'MODERATE',
      },
      pauses: {
        minCount: 0,
        expectedHesitationCount: 0,
      },
      repetitions: {
        minCount: 0,
      },
      grammar: {
        minIssues: 1, // "times is" -> "times are"
      },
    },
  },
]
