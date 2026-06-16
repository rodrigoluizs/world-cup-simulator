/**
 * Shared domain types. Kept deliberately small and decoupled so later Beans
 * (multiple groups, an elimination bracket) can extend them without a rewrite.
 */

export interface Team {
  /** Display name, e.g. "Mexico". */
  name: string
  /** Short 3-letter code, e.g. "MEX". Unique within a group. */
  code: string
  /** FIFA confederation, e.g. "CONCACAF". */
  confederation: string
}

export interface Group {
  /** Group label, e.g. "Group A". */
  name: string
  teams: Team[]
}

export interface Match {
  home: Team
  away: Team
}

export interface MatchResult {
  match: Match
  homeGoals: number
  awayGoals: number
}
