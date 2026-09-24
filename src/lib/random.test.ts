import { describe, expect, it } from 'vitest'
import { createRandom } from './random'

describe('createRandom', () => {
  it('is deterministic for a seed (stable screenshots)', () => {
    const a = createRandom(42)
    const b = createRandom(42)
    expect(Array.from({ length: 5 }, a)).toEqual(Array.from({ length: 5 }, b))
  })

  it('produces values in [0, 1) that differ between seeds', () => {
    const random = createRandom(1)
    const values = Array.from({ length: 1000 }, random)
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...values)).toBeLessThan(1)
    expect(createRandom(2)()).not.toBe(createRandom(1)())
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length
    expect(mean).toBeGreaterThan(0.45)
    expect(mean).toBeLessThan(0.55)
  })
})
