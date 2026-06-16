import { describe, expect, it } from 'vitest'
import { intervalForSpeed, isComplete } from './app'

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
