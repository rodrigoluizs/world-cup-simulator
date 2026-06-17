import { describe, expect, it } from 'vitest'
import type { BracketTeam, Tie, TieResult } from './bracket'
import { buildFinalTimeline } from './final-timeline'

const seq = (values: number[]) => {
  let i = 0
  return () => values[i++ % values.length]
}

const mockBt = (code: string): BracketTeam => ({
  team: { name: code, code, confederation: 'TEST' },
  sourceLabel: code,
})

function makeTie(): Tie {
  return { home: mockBt('AAA'), away: mockBt('BBB') }
}

function makeResult(homeGoals: number, awayGoals: number, decidedByTiebreak: boolean): TieResult {
  const tie = makeTie()
  const homeWins =
    homeGoals > awayGoals || (homeGoals === awayGoals && decidedByTiebreak)
  return {
    tie,
    homeGoals,
    awayGoals,
    winner: homeWins ? tie.home : tie.away,
    loser: homeWins ? tie.away : tie.home,
    decidedByTiebreak,
  }
}

describe('buildFinalTimeline', () => {
  it('produces exactly the right number of goals', () => {
    const t = buildFinalTimeline(makeResult(3, 1, false))
    expect(t.goals).toHaveLength(4)
    expect(t.goals.filter((g) => g.side === 'home')).toHaveLength(3)
    expect(t.goals.filter((g) => g.side === 'away')).toHaveLength(1)
  })

  it('orders goals chronologically', () => {
    const t = buildFinalTimeline(makeResult(2, 2, false))
    const mins = t.goals.map((g) => g.minute)
    for (let i = 1; i < mins.length; i++) {
      expect(mins[i]).toBeGreaterThanOrEqual(mins[i - 1])
    }
  })

  it('places all regulation goals within 1..90', () => {
    const t = buildFinalTimeline(makeResult(3, 2, false))
    for (const g of t.goals) {
      expect(g.minute).toBeGreaterThanOrEqual(1)
      expect(g.minute).toBeLessThanOrEqual(90)
    }
  })

  it('adds extra time when decidedByTiebreak is true', () => {
    const t = buildFinalTimeline(makeResult(1, 1, true))
    expect(t.extraTime).toBe(true)
    expect(t.finalMinute).toBeGreaterThan(90)
  })

  it('uses regulation only when not a tiebreak', () => {
    const t = buildFinalTimeline(makeResult(2, 1, false))
    expect(t.extraTime).toBe(false)
    expect(t.finalMinute).toBe(90)
  })

  it('is deterministic under the same seeded rng', () => {
    const result = makeResult(2, 1, false)
    const rng = () => seq([0.5, 0.1, 0.9, 0.3, 0.7, 0.2, 0.8])
    const t1 = buildFinalTimeline(result, rng())
    const t2 = buildFinalTimeline(result, rng())
    expect(t1).toEqual(t2)
  })

  it('handles a goalless tiebreak — no goals, extra time', () => {
    const t = buildFinalTimeline(makeResult(0, 0, true))
    expect(t.goals).toHaveLength(0)
    expect(t.extraTime).toBe(true)
    expect(t.finalMinute).toBeGreaterThan(90)
  })

  it('tracks running score correctly', () => {
    const t = buildFinalTimeline(makeResult(3, 1, false))
    const last = t.goals[t.goals.length - 1]
    expect(last.homeScore).toBe(3)
    expect(last.awayScore).toBe(1)
  })
})
