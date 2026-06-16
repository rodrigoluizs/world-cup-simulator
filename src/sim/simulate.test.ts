import { describe, expect, it } from 'vitest'
import type { Match, Team } from '../model/types'
import { MAX_GOALS, type Rng, simulateGroup, simulateMatch } from './simulate'

const team = (code: string): Team => ({ name: code, code, confederation: 'TEST' })
const match = (a: string, b: string): Match => ({ home: team(a), away: team(b) })

/** RNG that replays a fixed sequence, cycling when exhausted. */
const seq = (values: number[]): Rng => {
  let i = 0
  return () => values[i++ % values.length]
}

describe('simulateMatch', () => {
  it('is deterministic for a fixed RNG (home reads first, away second)', () => {
    const result = simulateMatch(match('A', 'B'), seq([0, 0.99]))
    expect(result.homeGoals).toBe(0)
    expect(result.awayGoals).toBe(MAX_GOALS)
  })

  it('produces non-negative integer goals within bounds for any rng in [0, 1)', () => {
    for (const r of [0, 0.1, 0.42, 0.5, 0.83, 0.999999]) {
      const { homeGoals, awayGoals } = simulateMatch(match('A', 'B'), () => r)
      for (const g of [homeGoals, awayGoals]) {
        expect(Number.isInteger(g)).toBe(true)
        expect(g).toBeGreaterThanOrEqual(0)
        expect(g).toBeLessThanOrEqual(MAX_GOALS)
      }
    }
  })
})

describe('simulateGroup', () => {
  it('returns one result per match, preserving order', () => {
    const matches = [match('A', 'B'), match('C', 'D'), match('E', 'F')]
    const results = simulateGroup(matches, seq([0.5]))

    expect(results).toHaveLength(matches.length)
    results.forEach((res, i) => expect(res.match).toBe(matches[i]))
  })
})
