import { describe, expect, it } from 'vitest'
import { computeQualification } from './qualification'
import { computeStandings } from './standings'
import type { Group, MatchResult } from '../model/types'

function team(code: string) {
  return { name: code, code, confederation: 'TEST' }
}

function result(homeCode: string, awayCode: string, hg: number, ag: number): MatchResult {
  return {
    match: { home: team(homeCode), away: team(awayCode) },
    homeGoals: hg,
    awayGoals: ag,
  }
}

function makeGroup(letter: string): Group {
  return {
    name: `Group ${letter}`,
    teams: [team(`${letter}1`), team(`${letter}2`), team(`${letter}3`), team(`${letter}4`)],
  }
}

function fullyPlayedEntry(letter: string, results: MatchResult[]) {
  const group = makeGroup(letter)
  return { group, standings: computeStandings(group.teams, results) }
}

function dominantResults(letter: string): MatchResult[] {
  const [t1, t2, t3, t4] = [`${letter}1`, `${letter}2`, `${letter}3`, `${letter}4`]
  return [
    result(t1, t2, 3, 0),
    result(t1, t3, 3, 0),
    result(t1, t4, 3, 0),
    result(t2, t3, 2, 0),
    result(t2, t4, 2, 0),
    result(t3, t4, 1, 0),
  ]
}

function makeEntries(count: number) {
  const letters = 'ABCDEFGHIJKL'.slice(0, count).split('')
  return letters.map((l) => fullyPlayedEntry(l, dominantResults(l)))
}

describe('computeQualification', () => {
  it('counts — 12 fully-played groups → 12 winners, 12 runners-up, 8 best thirds', () => {
    const entries = makeEntries(12)
    const result = computeQualification(entries)
    expect(result.winners).toHaveLength(12)
    expect(result.runnersUp).toHaveLength(12)
    expect(result.bestThirds).toHaveLength(8)
    const total = result.winners.length + result.runnersUp.length + result.bestThirds.length
    expect(total).toBe(32)
  })

  it('winners — each group position-1 team appears in winners only', () => {
    const entries = makeEntries(12)
    const { winners, runnersUp, bestThirds } = computeQualification(entries)
    for (const w of winners) {
      expect(w.position).toBe(1)
      expect(runnersUp.map((t) => t.team.code)).not.toContain(w.team.code)
      expect(bestThirds.map((t) => t.team.code)).not.toContain(w.team.code)
    }
  })

  it('thirds ranking — selects the 8 highest-points thirds', () => {
    const letters = 'ABCDEFGHIJKL'.split('')
    const entries = letters.map((l, i) => {
      const group = makeGroup(l)
      const [t1, t2, t3, t4] = group.teams.map((t) => t.code)
      const results: MatchResult[] = [
        result(t1, t2, 3, 0),
        result(t1, t3, 3, 0),
        result(t1, t4, 3, 0),
        result(t2, t3, 2, 0),
        result(t2, t4, 2, 0),
        // groups 0..3: t4 beats t3 1-0 (third = t4, GD -4, GF 1)
        // groups 4..11: t3 beats t4 3-0 (third = t3, GD -2, GF 3) — better GD
        i < 4 ? result(t4, t3, 1, 0) : result(t3, t4, 3, 0),
      ]
      return { group, standings: computeStandings(group.teams, results) }
    })
    const { bestThirds } = computeQualification(entries)
    expect(bestThirds).toHaveLength(8)
    // the 8 best thirds should be from groups E..L (indices 4..11 → points > 0)
    const expectedGroups = new Set(['Group E', 'Group F', 'Group G', 'Group H', 'Group I', 'Group J', 'Group K', 'Group L'])
    for (const t of bestThirds) {
      expect(expectedGroups.has(t.group)).toBe(true)
    }
  })

  it('thirds tiebreak — equal points ordered by goalDiff then goalsFor', () => {
    // two groups with identical third-place points but different goal differences
    const groupA = makeGroup('A')
    const [a1, a2, a3, a4] = groupA.teams.map((t) => t.code)
    const groupB = makeGroup('B')
    const [b1, b2, b3, b4] = groupB.teams.map((t) => t.code)

    const entriesAB = [
      {
        group: groupA,
        standings: computeStandings(groupA.teams, [
          result(a1, a2, 3, 0), result(a1, a3, 3, 0), result(a1, a4, 3, 0),
          result(a2, a3, 2, 0), result(a2, a4, 2, 0),
          result(a3, a4, 1, 0), // A3 gets 3 pts, GD +1, GF 1
        ]),
      },
      {
        group: groupB,
        standings: computeStandings(groupB.teams, [
          result(b1, b2, 3, 0), result(b1, b3, 3, 0), result(b1, b4, 3, 0),
          result(b2, b3, 2, 0), result(b2, b4, 2, 0),
          result(b3, b4, 3, 0), // B3 gets 3 pts, GD +3, GF 3 — better than A3
        ]),
      },
    ]
    const { bestThirds } = computeQualification(entriesAB)
    // with only 2 groups, cap is 2 (< 8) — both advance, B3 should rank first
    expect(bestThirds[0].group).toBe('Group B')
    expect(bestThirds[1].group).toBe('Group A')
  })

  it('partial — fewer than 12 groups and partial results does not throw', () => {
    const entries = makeEntries(3)
    const { winners, runnersUp, bestThirds } = computeQualification(entries)
    expect(winners).toHaveLength(3)
    expect(runnersUp).toHaveLength(3)
    expect(bestThirds.length).toBeLessThanOrEqual(3)
  })
})
