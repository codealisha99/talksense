import type { NormalizedWord, VocabularyMetrics } from '../../../src/speech.ts'

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'to', 'in', 'on', 'at', 'of', 'for',
  'with', 'it', 'that', 'this', 'i', 'you', 'he', 'she', 'we', 'they', 'as', 'be', 'by', 'from', 'have',
  'has', 'had', 'do', 'does', 'did', 'so', 'not', 'what', 'which', 'who', 'how', 'when', 'where', 'there',
])

export class VocabularyAnalyzer {
  public analyze(words: NormalizedWord[], windowSize: number = 50): VocabularyMetrics {
    const totalWords = words.length
    if (totalWords === 0) {
      return {
        totalWords: 0,
        uniqueWords: 0,
        typeTokenRatio: 0,
        movingAverageTTR: 0,
        ttrWindowSize: windowSize,
        repetitiveWords: [],
        domainTerms: [],
      }
    }

    const cleanTokens = words
      .map((w) => w.text.toLowerCase().replace(/^[^\w]+|[^\w]+$/g, ''))
      .filter((t) => t.length > 0)

    const uniqueWords = new Set(cleanTokens).size
    const typeTokenRatio = cleanTokens.length > 0
      ? Math.round((uniqueWords / cleanTokens.length) * 1000) / 1000
      : 0

    // Moving-Average Type-Token Ratio (MATTR)
    let mattr = typeTokenRatio
    if (cleanTokens.length >= windowSize) {
      let sumTtr = 0
      const windows = cleanTokens.length - windowSize + 1
      for (let i = 0; i < windows; i++) {
        const slice = cleanTokens.slice(i, i + windowSize)
        const windowUnique = new Set(slice).size
        sumTtr += windowUnique / windowSize
      }
      mattr = Math.round((sumTtr / windows) * 1000) / 1000
    }

    // Identify repetitive content words (excluding common stop words)
    const counts = new Map<string, number>()
    for (const t of cleanTokens) {
      if (!STOPWORDS.has(t) && t.length > 2) {
        counts.set(t, (counts.get(t) ?? 0) + 1)
      }
    }

    const repetitiveWords = Array.from(counts.entries())
      .filter(([, count]) => count >= 3)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }))

    // Detect technical/domain terms (longer low-frequency content words)
    const domainTerms = Array.from(counts.keys())
      .filter((t) => t.length >= 7 && !STOPWORDS.has(t))
      .slice(0, 8)

    return {
      totalWords,
      uniqueWords,
      typeTokenRatio,
      movingAverageTTR: mattr,
      ttrWindowSize: windowSize,
      repetitiveWords,
      domainTerms,
    }
  }
}
