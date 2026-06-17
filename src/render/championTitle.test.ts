import { describe, expect, it } from 'vitest'
import { ordinal, championTitleSummary } from './championTitle'
import { type Team } from '../model/types'

const team = (code: string, name: string): Team => ({ name, code, confederation: 'TEST' })

describe('ordinal', () => {
  it('handles 1st, 2nd, 3rd', () => {
    expect(ordinal(1)).toBe('1st')
    expect(ordinal(2)).toBe('2nd')
    expect(ordinal(3)).toBe('3rd')
  })

  it('uses th for 4–10', () => {
    expect(ordinal(4)).toBe('4th')
    expect(ordinal(6)).toBe('6th')
    expect(ordinal(10)).toBe('10th')
  })

  it('uses th for 11, 12, 13 (teen exception)', () => {
    expect(ordinal(11)).toBe('11th')
    expect(ordinal(12)).toBe('12th')
    expect(ordinal(13)).toBe('13th')
  })

  it('resumes suffix for 21, 22, 23', () => {
    expect(ordinal(21)).toBe('21st')
    expect(ordinal(22)).toBe('22nd')
    expect(ordinal(23)).toBe('23rd')
  })
})

describe('championTitleSummary', () => {
  it('BRA: 5 prior titles → 6th, lists short years', () => {
    const result = championTitleSummary(team('BRA', 'Brazil'))
    expect(result.count).toBe(6)
    expect(result.isFirst).toBe(false)
    expect(result.priorYears).toEqual([1958, 1962, 1970, 1994, 2002])
    expect(result.html).toContain('6th title')
    expect(result.html).toContain('58')
    expect(result.html).toContain('2002')
  })

  it('ENG: 1 prior title → 2nd, lists 66', () => {
    const result = championTitleSummary(team('ENG', 'England'))
    expect(result.count).toBe(2)
    expect(result.isFirst).toBe(false)
    expect(result.priorYears).toEqual([1966])
    expect(result.html).toContain('2nd title')
    expect(result.html).toContain('66')
  })

  it('first-timer: 0 prior titles → first title, no year list', () => {
    const result = championTitleSummary(team('CAN', 'Canada'))
    expect(result.count).toBe(1)
    expect(result.isFirst).toBe(true)
    expect(result.priorYears).toEqual([])
    expect(result.html).toContain('first title')
    expect(result.html).not.toContain('prior-years')
  })

  it('GER: 4 prior titles (including West Germany) → 5th', () => {
    const result = championTitleSummary(team('GER', 'Germany'))
    expect(result.count).toBe(5)
    expect(result.priorYears).toEqual([1954, 1974, 1990, 2014])
    expect(result.html).toContain('5th title')
  })
})
