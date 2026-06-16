import { describe, expect, it } from 'vitest'
import { isComplete } from './app'

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
