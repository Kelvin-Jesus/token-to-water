import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { TIERS } from '@/constants/scales'
import { resolveTier } from './conversion'
import { createLadder } from './ladder'

const FLOOR = TIERS[0].volumeLiters / 100
const ladder = createLadder(FLOOR)
const EARTH = TIERS.at(-1)!.volumeLiters

describe('createLadder', () => {
  it('puts every tier on a whole rung', () => {
    expect(ladder.toPosition(FLOOR)).toBe(-1)
    TIERS.forEach((tier, index) => {
      expect(ladder.toPosition(tier.volumeLiters)).toBeCloseTo(index, 9)
      expect(ladder.toLiters(index) / tier.volumeLiters).toBeCloseTo(1, 9)
    })
  })

  it('treats empty as the bottom rung', () => {
    expect(ladder.toPosition(0)).toBe(-1)
    expect(ladder.toLiters(-5)).toBe(FLOOR)
  })

  it('gives the tiny bucket → jug step the same width as the huge lake → Amazon step', () => {
    const bucket = TIERS.findIndex((tier) => tier.id === 'bucket')
    const lake = TIERS.findIndex((tier) => tier.id === 'small-lake')
    expect(ladder.toPosition(TIERS[bucket + 1]!.volumeLiters) - ladder.toPosition(TIERS[bucket]!.volumeLiters)).toBeCloseTo(1)
    expect(ladder.toPosition(TIERS[lake + 1]!.volumeLiters) - ladder.toPosition(TIERS[lake]!.volumeLiters)).toBeCloseTo(1)
  })

  it('extrapolates past the last tier', () => {
    expect(ladder.toPosition(EARTH * 2)).toBeGreaterThan(TIERS.length - 1)
    expect(ladder.toLiters(ladder.toPosition(EARTH * 7)) / (EARTH * 7)).toBeCloseTo(1, 9)
  })

  it('rejects invalid input', () => {
    expect(() => createLadder(0)).toThrow(RangeError)
    expect(() => createLadder(1)).toThrow(RangeError)
    expect(() => createLadder(FLOOR, TIERS.slice(0, 1))).toThrow(RangeError)
    expect(() => ladder.toPosition(Number.NaN)).toThrow(RangeError)
    expect(() => ladder.toLiters(Number.NaN)).toThrow(RangeError)
  })

  describe('properties', () => {
    const volume = fc.double({ min: FLOOR * 1.0001, max: EARTH * 100, noNaN: true })

    it('round-trips litres ⇄ position', () => {
      fc.assert(
        fc.property(volume, (liters) => {
          expect(ladder.toLiters(ladder.toPosition(liters)) / liters).toBeCloseTo(1, 9)
        }),
      )
    })

    it('is strictly increasing', () => {
      fc.assert(
        fc.property(volume, volume, (a, b) => {
          fc.pre(Math.abs(a - b) / Math.max(a, b) > 1e-9)
          const [low, high] = a < b ? [a, b] : [b, a]
          expect(ladder.toPosition(low)).toBeLessThan(ladder.toPosition(high))
        }),
      )
    })

    it('agrees with resolveTier: position (k-1, k] means tier k is filling', () => {
      fc.assert(
        fc.property(fc.double({ min: TIERS[0].volumeLiters * 1.001, max: EARTH * 0.999, noNaN: true }), (liters) => {
          const position = ladder.toPosition(liters)
          expect(resolveTier(liters).index).toBe(Math.ceil(position - 1e-9))
        }),
      )
    })
  })
})
