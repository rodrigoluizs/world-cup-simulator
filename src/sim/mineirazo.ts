import type { Match, MatchResult } from '../model/types'

/**
 * The "Mineirazo" easter egg: a hidden modifier that rigs the tournament so the
 * final is always Brazil vs Germany, won 7-1 by Brazil. These constants are the
 * single source of truth for the teams and scoreline involved; the group-stage
 * and knockout rigging both key off them.
 */

/** Team that always reaches and wins the final (home side of the rigged final). */
export const MINEIRAZO_HOME_CODE = 'BRA'
/** Team that always reaches and loses the final (away side of the rigged final). */
export const MINEIRAZO_AWAY_CODE = 'GER'
/** Goals for Brazil in the rigged final. */
export const MINEIRAZO_HOME_GOALS = 7
/** Goals for Germany in the rigged final. */
export const MINEIRAZO_AWAY_GOALS = 1

/** True when either side of the match is one of the rigged teams. */
function riggedCodeOf(match: Match): string | null {
  if (match.home.code === MINEIRAZO_HOME_CODE || match.away.code === MINEIRAZO_HOME_CODE) {
    return MINEIRAZO_HOME_CODE
  }
  if (match.home.code === MINEIRAZO_AWAY_CODE || match.away.code === MINEIRAZO_AWAY_CODE) {
    return MINEIRAZO_AWAY_CODE
  }
  return null
}

/**
 * Force Brazil and Germany to win every group match they play, so each finishes
 * top of its group and is seeded as a group winner. Matches involving neither
 * team are returned unchanged. The scoreline is a decisive 1-0 in their favour.
 */
export function rigGroupResults(matches: Match[], results: MatchResult[]): MatchResult[] {
  return results.map((result, i) => {
    const match = matches[i]
    const code = riggedCodeOf(match)
    if (!code) return result
    const homeWins = match.home.code === code
    return {
      match,
      homeGoals: homeWins ? 1 : 0,
      awayGoals: homeWins ? 0 : 1,
    }
  })
}
