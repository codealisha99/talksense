import type { PaceThresholds } from './engine.ts'

export type PacingProfileType = 'conversational' | 'presentation' | 'technical_explanation' | 'debate'

export const PACING_PROFILES: Record<PacingProfileType, PaceThresholds> = {
  conversational: {
    verySlowMax: 110,
    slowMax: 130,
    moderateMax: 165,
    fastMax: 190,
    pauseExclusionThresholdSeconds: 0.5,
  },
  presentation: {
    verySlowMax: 100,
    slowMax: 120,
    moderateMax: 155,
    fastMax: 180,
    pauseExclusionThresholdSeconds: 0.6,
  },
  technical_explanation: {
    verySlowMax: 90,
    slowMax: 115,
    moderateMax: 145,
    fastMax: 175,
    pauseExclusionThresholdSeconds: 0.5,
  },
  debate: {
    verySlowMax: 125,
    slowMax: 150,
    moderateMax: 195,
    fastMax: 230,
    pauseExclusionThresholdSeconds: 0.4,
  },
}

export function getRecommendedPaceRange(profile: PacingProfileType = 'technical_explanation'): {
  minWpm: number
  maxWpm: number
  description: string
} {
  const p = PACING_PROFILES[profile]
  return {
    minWpm: p.slowMax,
    maxWpm: p.moderateMax,
    description: `Optimal ${profile.replace('_', ' ')} pace is between ${p.slowMax} and ${p.moderateMax} WPM for clear listener comprehension.`,
  }
}
