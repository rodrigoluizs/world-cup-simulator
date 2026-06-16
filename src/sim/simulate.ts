import type { Match, MatchResult } from '../model/types'

/** Randomness source. Returns a float in [0, 1). Defaults to Math.random. */
export type Rng = () => number

/** Highest number of goals a single team can score in a match. */
export const MAX_GOALS = 5

function goals(rng: Rng): number {
  return Math.floor(rng() * (MAX_GOALS + 1))
}

/** Simulate one match with a purely random scoreline. */
export function simulateMatch(match: Match, rng: Rng = Math.random): MatchResult {
  return {
    match,
    homeGoals: goals(rng),
    awayGoals: goals(rng),
  }
}

/** Simulate every match, preserving input order. */
export function simulateGroup(matches: Match[], rng: Rng = Math.random): MatchResult[] {
  return matches.map((match) => simulateMatch(match, rng))
}
