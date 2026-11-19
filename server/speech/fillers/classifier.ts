import type { FillerClassification, NormalizedWord } from '../../../src/speech.ts'
import type { CandidateMatch } from './matcher.ts'

export type ClassificationResult = {
  classification: FillerClassification
  confidence: number
  reason: string
}

/**
 * Contextual classifier that analyzes syntactic position and surrounding tokens
 * to distinguish confirmed verbal fillers from legitimate semantic usage.
 */
export class FillerContextClassifier {
  public classify(candidate: CandidateMatch, allWords: NormalizedWord[]): ClassificationResult {
    const { entry, startIndex, endIndex, matchedText } = candidate

    // 1. Unconditional non-lexical fillers (e.g. "um", "uh", "er")
    if (entry.unconditionalFiller) {
      return {
        classification: 'CONFIRMED_FILLER',
        confidence: 0.98,
        reason: 'Unvoiced hesitation utterance without lexical meaning.',
      }
    }

    const prevWord = startIndex > 0 ? allWords[startIndex - 1].text.toLowerCase() : null
    const prevPunct = startIndex > 0 ? allWords[startIndex - 1].punctuatedText : null
    const nextWord = endIndex < allWords.length - 1 ? allWords[endIndex + 1].text.toLowerCase() : null

    // 2. Disambiguate "like"
    if (entry.canonical === 'like') {
      // "I like", "they like", "you like", "we like" -> Transitive verb
      if (prevWord && ['i', 'we', 'they', 'you', 'people', 'users', 'who', 'would', 'to'].includes(prevWord)) {
        return {
          classification: 'MEANINGFUL_USAGE',
          confidence: 0.92,
          reason: 'Used as a transitive verb or infinitive complement.',
        }
      }
      // "looks like", "sounds like", "feels like", "just like", "act like" -> Prepositional comparison
      if (prevWord && ['looks', 'sounds', 'feels', 'just', 'more', 'act', 'something', 'anything', 'much'].includes(prevWord)) {
        return {
          classification: 'MEANINGFUL_USAGE',
          confidence: 0.9,
          reason: 'Used as a comparative preposition or simile marker.',
        }
      }
      // "like a", "like an", "like the" -> Comparative simile
      if (nextWord && ['a', 'an', 'the', 'this', 'that'].includes(nextWord) && prevWord && !['was', 'is', 'were'].includes(prevWord)) {
        return {
          classification: 'MEANINGFUL_USAGE',
          confidence: 0.8,
          reason: 'Preposition introducing an exemplar or comparison.',
        }
      }
      const hasPauseOrComma = (prevPunct && /[,.?!]/.test(prevPunct)) || startIndex === 0
      if (hasPauseOrComma) {
        return {
          classification: 'CONFIRMED_FILLER',
          confidence: 0.85,
          reason: 'Parenthetical hesitation token lacking syntactic connection.',
        }
      }
      // "things like this", "algorithms like quicksort" -> Prepositional exemplar
      if (prevWord && !['was', 'is', 'were', 'and', 'so', 'but'].includes(prevWord) && nextWord && !['um', 'uh', 'you', 'i', 'we'].includes(nextWord)) {
        return {
          classification: 'MEANINGFUL_USAGE',
          confidence: 0.88,
          reason: 'Preposition introducing an exemplar or comparison.',
        }
      }
      return {
        classification: 'DISCOURSE_MARKER',
        confidence: 0.7,
        reason: 'Informal speech hedge.',
      }
    }

    // 3. Disambiguate "actually"
    if (entry.canonical === 'actually') {
      const hasPauseOrComma = (prevPunct && /[,.?!]/.test(prevPunct)) || startIndex === 0
      if (hasPauseOrComma) {
        return {
          classification: 'DISCOURSE_MARKER',
          confidence: 0.85,
          reason: 'Sentence-level discourse marker for contrast or framing.',
        }
      }
      // Within-clause adverb modifying a verb, adjective, or clause
      return {
        classification: 'MEANINGFUL_USAGE',
        confidence: 0.88,
        reason: 'Adverb qualifying a factual assertion.',
      }
    }

    // 4. Disambiguate "you know"
    if (entry.canonical === 'you know') {
      // "do you know", "if you know", "as you know" -> Legitimate cognitive verb
      const wordBeforeYou = startIndex > 0 ? allWords[startIndex - 1].text.toLowerCase() : null
      if (wordBeforeYou && ['do', 'did', 'if', 'as', 'will', 'should'].includes(wordBeforeYou)) {
        return {
          classification: 'MEANINGFUL_USAGE',
          confidence: 0.95,
          reason: 'Direct question or conditional referencing listener knowledge.',
        }
      }
      // "you know that", "you know what" -> Verb taking clause
      if (nextWord && ['that', 'what', 'how', 'why', 'who', 'where'].includes(nextWord)) {
        return {
          classification: 'MEANINGFUL_USAGE',
          confidence: 0.85,
          reason: 'Verb governing an object or content clause.',
        }
      }
      return {
        classification: 'CONFIRMED_FILLER',
        confidence: 0.85,
        reason: 'Formulaic verbal habit seeking reassurance or filling silence.',
      }
    }

    // 5. Disambiguate "basically"
    if (entry.canonical === 'basically') {
      if (prevWord && ['is', 'are', 'was', 'were'].includes(prevWord)) {
        return {
          classification: 'MEANINGFUL_USAGE',
          confidence: 0.8,
          reason: 'Adverbial modifier summarizing mechanism.',
        }
      }
      return {
        classification: 'DISCOURSE_MARKER',
        confidence: 0.7,
        reason: 'Discourse framing device.',
      }
    }

    // 6. Disambiguate "sort of" / "kind of"
    if (entry.canonical === 'sort of' || entry.canonical === 'kind of') {
      // "sort of thing", "a kind of" -> Categorical noun phrase
      const wordBefore = startIndex > 0 ? allWords[startIndex - 1].text.toLowerCase() : null
      if (wordBefore && ['a', 'one', 'what', 'this', 'that'].includes(wordBefore)) {
        return {
          classification: 'MEANINGFUL_USAGE',
          confidence: 0.85,
          reason: 'Noun phrase referring to a taxonomic category or type.',
        }
      }
      return {
        classification: 'CONFIRMED_FILLER',
        confidence: 0.78,
        reason: 'Hedging filler phrase indicating uncertainty.',
      }
    }

    // 7. Disambiguate "so"
    if (entry.canonical === 'so') {
      // "so that", "so much", "so many", "not so" -> Intensifier or purposive conjunction
      if (nextWord && ['that', 'much', 'many', 'far', 'long', 'fast', 'good'].includes(nextWord)) {
        return {
          classification: 'MEANINGFUL_USAGE',
          confidence: 0.95,
          reason: 'Adverbial intensifier or degree modifier.',
        }
      }
      if (prevWord && ['and', 'but'].includes(prevWord)) {
        return {
          classification: 'MEANINGFUL_USAGE',
          confidence: 0.8,
          reason: 'Coordinating logical consequence.',
        }
      }
      if (startIndex === 0 || (prevPunct && /[.!?]/.test(prevPunct))) {
        return {
          classification: 'DISCOURSE_MARKER',
          confidence: 0.7,
          reason: 'Sentence-initial transition marker.',
        }
      }
      return {
        classification: 'MEANINGFUL_USAGE',
        confidence: 0.75,
        reason: 'Conjunction linking causal arguments.',
      }
    }

    // 8. Disambiguate "well"
    if (entry.canonical === 'well') {
      // "as well", "well known", "did well" -> Adverb
      if (prevWord && ['as', 'very', 'did', 'does', 'works', 'is'].includes(prevWord)) {
        return {
          classification: 'MEANINGFUL_USAGE',
          confidence: 0.95,
          reason: 'Adverb expressing quality or addition.',
        }
      }
      if (startIndex === 0 || (prevPunct && /[.!?]/.test(prevPunct))) {
        return {
          classification: 'DISCOURSE_MARKER',
          confidence: 0.75,
          reason: 'Discourse particle opening a thought.',
        }
      }
      return {
        classification: 'UNCERTAIN',
        confidence: 0.5,
        reason: 'Ambiguous syntactic position.',
      }
    }

    // 9. Disambiguate "right"
    if (entry.canonical === 'right') {
      // "all right", "right now", "turn right", "that is right" -> Meaningful
      if (prevWord && ['all', 'the', 'is', 'was', 'turn', 'that'].includes(prevWord) || nextWord === 'now') {
        return {
          classification: 'MEANINGFUL_USAGE',
          confidence: 0.95,
          reason: 'Directional, temporal, or factual correctness term.',
        }
      }
      const isEnd = endIndex === allWords.length - 1 || (candidate.matchedWords[0].punctuatedText?.endsWith('?'))
      if (isEnd) {
        return {
          classification: 'DISCOURSE_MARKER',
          confidence: 0.75,
          reason: 'Affirmation seeking tag question.',
        }
      }
      return {
        classification: 'UNCERTAIN',
        confidence: 0.5,
        reason: 'Context is ambiguous.',
      }
    }

    return {
      classification: 'DISCOURSE_MARKER',
      confidence: 0.65,
      reason: 'Discourse token used during spontaneous speech.',
    }
  }
}
