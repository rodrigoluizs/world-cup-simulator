import { describe, expect, it } from 'vitest'
import type { Team } from '../model/types'
import { advanceRound, createKnockout, resolveTie, seedBracket, type Tie } from './bracket'
import { groupLetter, type QualificationResult } from './qualification'
import type { Rng } from './simulate'
import { placeThirds } from './thirds-placement'

const team = (code: string): Team => ({ name: code, code, confederation: 'TEST' })
const LETTERS = 'ABCDEFGHIJKL'.split('')

/** RNG that replays a fixed sequence, cycling when exhausted. */
const seq = (values: number[]): Rng => {
  let i = 0
  return () => values[i++ % values.length]
}

/** A finished group stage: 12 winners, 12 runners-up, 8 best thirds (groups A–H). */
function fullQualification(): QualificationResult {
  return {
    winners: LETTERS.map((l) => ({ team: team(`W${l}`), group: `Group ${l}`, position: 1 })),
    runnersUp: LETTERS.map((l) => ({ team: team(`R${l}`), group: `Group ${l}`, position: 2 })),
    bestThirds: LETTERS.slice(0, 8).map((l) => ({
      team: team(`T${l}`),
      group: `Group ${l}`,
      position: 3,
    })),
  }
}

function tieCodes(ties: Tie[]): string[] {
  return ties.flatMap((t) => [t.home.team.code, t.away.team.code])
}

describe('groupLetter', () => {
  it('parses the letter from a group name', () => {
    expect(groupLetter('Group L')).toBe('L')
    expect(groupLetter('Group A')).toBe('A')
  })
})

describe('placeThirds', () => {
  it('maps a known combo to alphabetical slot assignment', () => {
    const placement = placeThirds(['H', 'C', 'A', 'F', 'B', 'E', 'D', 'G'])
    expect(placement).toEqual({
      '0': 'A',
      '1': 'B',
      '2': 'C',
      '3': 'D',
      '4': 'E',
      '5': 'F',
      '6': 'G',
      '7': 'H',
    })
  })
})

describe('seedBracket', () => {
  it('builds 16 ties with every qualified team appearing exactly once', () => {
    const ties = seedBracket(fullQualification())
    expect(ties).toHaveLength(16)

    const codes = tieCodes(ties)
    expect(codes).toHaveLength(32)
    expect(new Set(codes).size).toBe(32)
  })
})

describe('resolveTie', () => {
  const tie: Tie = {
    home: { team: team('HOME'), sourceLabel: 'Winner A' },
    away: { team: team('AWAY'), sourceLabel: '3rd B' },
  }

  it('decisive — higher scorer wins without a tiebreak', () => {
    const result = resolveTie(tie, seq([0.4, 0.2])) // home floor(2.4)=2, away floor(1.2)=1
    expect(result.homeGoals).toBe(2)
    expect(result.awayGoals).toBe(1)
    expect(result.winner.team.code).toBe('HOME')
    expect(result.loser.team.code).toBe('AWAY')
    expect(result.decidedByTiebreak).toBe(false)
  })

  it('draw — a level scoreline is broken by a tiebreak, leaving one winner', () => {
    const result = resolveTie(tie, seq([0.2, 0.2, 0.9])) // 1–1, then flip 0.9 → away
    expect(result.homeGoals).toBe(result.awayGoals)
    expect(result.decidedByTiebreak).toBe(true)
    expect(result.winner.team.code).toBe('AWAY')
    expect(result.loser.team.code).toBe('HOME')
  })
})

describe('advanceRound', () => {
  it('pairs adjacent winners into the next round', () => {
    const results = seedBracket(fullQualification())
      .slice(0, 4)
      .map((t) => resolveTie(t, seq([0.9, 0.1]))) // home always wins
    const next = advanceRound(results)
    expect(next).toHaveLength(2)
    expect(next[0].home.team.code).toBe(results[0].winner.team.code)
    expect(next[0].away.team.code).toBe(results[1].winner.team.code)
  })
})

describe('createKnockout', () => {
  it('plays through to a single champion and a third-place winner', () => {
    const knockout = createKnockout(fullQualification(), seq([0.7, 0.3, 0.5]))

    while (knockout.revealNextTie() !== null) {
      // reveal every tie
    }

    expect(knockout.isComplete()).toBe(true)
    const champion = knockout.champion()
    expect(champion).not.toBeNull()

    const thirdPlace = knockout.rounds.find((r) => r.round === '3P')!
    expect(thirdPlace.results).toHaveLength(1)
    expect(thirdPlace.results[0].winner.team.code).toBeTruthy()
  })

  it('reveals in order — complete only after the final tie is revealed', () => {
    const knockout = createKnockout(fullQualification(), seq([0.7, 0.3, 0.5]))
    expect(knockout.totalTies).toBe(32) // 16 + 8 + 4 + 2 + 1 + 1

    for (let i = 1; i < knockout.totalTies; i++) {
      knockout.revealNextTie()
      expect(knockout.isComplete()).toBe(false)
      expect(knockout.champion()).toBeNull()
    }

    const last = knockout.revealNextTie()
    expect(last?.round).toBe('F')
    expect(knockout.isComplete()).toBe(true)
    expect(knockout.champion()).not.toBeNull()
    expect(knockout.revealNextTie()).toBeNull()
  })
})
