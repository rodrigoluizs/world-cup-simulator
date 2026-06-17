import { describe, expect, it } from 'vitest'
import { intervalForSpeed, isComplete, knockoutInterval } from './app'

describe('isComplete', () => {
  it('is true when every match has been revealed', () => {
    expect(isComplete(6, 6)).toBe(true)
  })

  it('is false before every match is revealed', () => {
    expect(isComplete(5, 6)).toBe(false)
  })

  it('is false when there are no matches', () => {
    expect(isComplete(0, 0)).toBe(false)
  })
})

describe('intervalForSpeed', () => {
  it('maps discrete multipliers to correct intervals', () => {
    expect(intervalForSpeed(1, 1200)).toBe(1200)
    expect(intervalForSpeed(2, 1200)).toBe(600)
    expect(intervalForSpeed(4, 1200)).toBe(300)
    expect(intervalForSpeed(8, 1200)).toBe(150)
  })

  it('uses 1200ms as default base', () => {
    expect(intervalForSpeed(1)).toBe(1200)
  })
})

describe('knockoutInterval', () => {
  it('lets early rounds follow the selected speed', () => {
    expect(knockoutInterval('R32', 8, 1200)).toBe(150)
    expect(knockoutInterval('R16', 2, 1200)).toBe(600)
    expect(knockoutInterval('QF', 4, 1200)).toBe(300)
  })

  it('pins semi-finals and third place to 1x regardless of speed', () => {
    expect(knockoutInterval('SF', 8, 1200)).toBe(1200)
    expect(knockoutInterval('3P', 4, 1200)).toBe(1200)
  })

  it('pauses at 1x before the final regardless of speed', () => {
    expect(knockoutInterval('F', 8, 1200)).toBe(1200)
  })
})
