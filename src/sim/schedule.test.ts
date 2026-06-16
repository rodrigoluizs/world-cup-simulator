import { describe, expect, it } from 'vitest'
import type { Team } from '../model/types'
import { generateMatches } from './schedule'

const team = (name: string): Team => ({
  name,
  code: name.toUpperCase(),
  confederation: 'TEST',
})

describe('generateMatches', () => {
  it('produces a round-robin: 4 teams -> 6 matches, each pair exactly once', () => {
    const teams = ['a', 'b', 'c', 'd'].map(team)
    const matches = generateMatches(teams)

    expect(matches).toHaveLength(6)
    const pairs = matches.map((m) => [m.home.code, m.away.code].sort().join('-'))
    expect(new Set(pairs).size).toBe(6)
  })

  it('never schedules a team against itself', () => {
    const teams = ['a', 'b', 'c', 'd'].map(team)
    for (const m of generateMatches(teams)) {
      expect(m.home.code).not.toBe(m.away.code)
    }
  })
})
