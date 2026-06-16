import type { Match, Team } from '../model/types'

/**
 * Round-robin schedule: every unordered pair of teams meets exactly once.
 * For n teams this yields n * (n - 1) / 2 matches.
 */
export function generateMatches(teams: Team[]): Match[] {
  const matches: Match[] = []
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      matches.push({ home: teams[i], away: teams[j] })
    }
  }
  return matches
}
