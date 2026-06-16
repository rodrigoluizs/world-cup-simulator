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
  /** Emoji flag, e.g. "🇲🇽". Optional for backwards compatibility. */
  flag?: string
}

export interface Standing {
  team: Team
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  points: number
}

export interface Group {
  /** Group label, e.g. "Group A". */
  name: string
  teams: Team[]
}

export interface Tournament {
  groups: Group[]
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
