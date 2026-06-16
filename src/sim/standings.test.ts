import { describe, expect, it } from 'vitest'
import type { Match, Team } from '../model/types'
import { computeStandings } from './standings'

const team = (code: string): Team => ({ name: code, code, confederation: 'TEST' })
const match = (a: string, b: string): Match => ({ home: team(a), away: team(b) })

describe('computeStandings', () => {
  it('computes points, wins, draws, losses, goals correctly', () => {
    const teams = [team('A'), team('B'), team('C')]
    // A beats B 2–0; A draws C 1–1
    const results = [
      { match: match('A', 'B'), homeGoals: 2, awayGoals: 0 },
      { match: match('A', 'C'), homeGoals: 1, awayGoals: 1 },
    ]
    const standings = computeStandings(teams, results)
    const a = standings.find((s) => s.team.code === 'A')!
    const b = standings.find((s) => s.team.code === 'B')!
    const c = standings.find((s) => s.team.code === 'C')!

    expect(a).toMatchObject({ played: 2, won: 1, drawn: 1, lost: 0, goalsFor: 3, goalsAgainst: 1, goalDiff: 2, points: 4 })
    expect(b).toMatchObject({ played: 1, won: 0, drawn: 0, lost: 1, goalsFor: 0, goalsAgainst: 2, goalDiff: -2, points: 0 })
    expect(c).toMatchObject({ played: 1, won: 0, drawn: 1, lost: 0, goalsFor: 1, goalsAgainst: 1, goalDiff: 0, points: 1 })
  })

  it('sorts by Pts then GD then GF', () => {
    const teams = [team('X'), team('Y'), team('Z')]
    // All teams end with 1 point (all draws), but different GD/GF
    const results = [
      { match: match('X', 'Y'), homeGoals: 3, awayGoals: 3 }, // X: GF3 GA3 GD0 Pts1 | Y: GF3 GA3 GD0 Pts1
      { match: match('X', 'Z'), homeGoals: 1, awayGoals: 0 }, // X wins: GF+1 GA+0 | Z: loses
      { match: match('Y', 'Z'), homeGoals: 2, awayGoals: 0 }, // Y wins: GF+2 GA+0 | Z: loses
    ]
    const standings = computeStandings(teams, results)
    // X: P3W1D1L1 GF4 GA3 GD+1 Pts4
    // Y: P3W1D1L1 GF5 GA3 GD+2 Pts4
    // Z: P2W0D0L2 GF0 GA4 GD-4 Pts0
    // Sorted: Y (GD+2) > X (GD+1) > Z
    expect(standings[0].team.code).toBe('Y')
    expect(standings[1].team.code).toBe('X')
    expect(standings[2].team.code).toBe('Z')
  })

  it('returns all teams with zero stats when no results', () => {
    const teams = [team('A'), team('B'), team('C')]
    const standings = computeStandings(teams, [])
    expect(standings).toHaveLength(3)
    for (const s of standings) {
      expect(s).toMatchObject({ played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0 })
    }
  })
})
