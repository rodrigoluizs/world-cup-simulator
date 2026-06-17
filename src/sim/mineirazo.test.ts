import { describe, expect, it } from 'vitest'
import type { Match, MatchResult, Team } from '../model/types'
import {
  MINEIRAZO_AWAY_CODE,
  MINEIRAZO_HOME_CODE,
  rigGroupResults,
} from './mineirazo'

const team = (code: string): Team => ({ name: code, code, confederation: 'TEST' })
const match = (a: string, b: string): Match => ({ home: team(a), away: team(b) })
const result = (m: Match, home: number, away: number): MatchResult => ({
  match: m,
  homeGoals: home,
  awayGoals: away,
})

const winnerCode = (r: MatchResult): string =>
  r.homeGoals > r.awayGoals ? r.match.home.code : r.match.away.code

describe('rigGroupResults', () => {
  it('forces Brazil to win when it is the away side', () => {
    const m = match('SCO', MINEIRAZO_HOME_CODE)
    const [rigged] = rigGroupResults([m], [result(m, 3, 0)])
    expect(winnerCode(rigged)).toBe(MINEIRAZO_HOME_CODE)
    expect(rigged.awayGoals).toBeGreaterThan(rigged.homeGoals)
  })

  it('forces Germany to win when it is the home side', () => {
    const m = match(MINEIRAZO_AWAY_CODE, 'ECU')
    const [rigged] = rigGroupResults([m], [result(m, 0, 2)])
    expect(winnerCode(rigged)).toBe(MINEIRAZO_AWAY_CODE)
    expect(rigged.homeGoals).toBeGreaterThan(rigged.awayGoals)
  })

  it('leaves matches without Brazil or Germany untouched', () => {
    const m = match('MEX', 'KOR')
    const original = result(m, 2, 1)
    const [rigged] = rigGroupResults([m], [original])
    expect(rigged).toEqual(original)
  })
})
