import type { MatchResult, Standing, Team } from '../model/types'

/** Compute a classic group standings table from a list of match results. */
export function computeStandings(teams: Team[], results: MatchResult[]): Standing[] {
  const map = new Map<string, Standing>(
    teams.map((team) => [
      team.code,
      { team, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0 },
    ]),
  )

  for (const { match, homeGoals, awayGoals } of results) {
    const home = map.get(match.home.code)
    const away = map.get(match.away.code)
    if (!home || !away) continue

    home.played++
    away.played++
    home.goalsFor += homeGoals
    home.goalsAgainst += awayGoals
    away.goalsFor += awayGoals
    away.goalsAgainst += homeGoals

    if (homeGoals > awayGoals) {
      home.won++
      home.points += 3
      away.lost++
    } else if (homeGoals < awayGoals) {
      away.won++
      away.points += 3
      home.lost++
    } else {
      home.drawn++
      away.drawn++
      home.points++
      away.points++
    }

    home.goalDiff = home.goalsFor - home.goalsAgainst
    away.goalDiff = away.goalsFor - away.goalsAgainst
  }

  return [...map.values()].sort(
    (a, b) => b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor,
  )
}
