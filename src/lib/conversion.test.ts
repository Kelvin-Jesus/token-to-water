import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { TIERS, WATER_FACTOR } from '@/constants/scales'
import { largestTierAtMost, resolveTier, tokensToFillTier, tokensToLiters } from './conversion'

const index = (id: string) => TIERS.findIndex((tier) => tier.id === id)
const EARTH = TIERS.at(-1)!.volumeLiters

describe('tokensToLiters', () => {
  it('applies 1 mL per token by default', () => {
    expect(tokensToLiters(500)).toBe(0.5)
    expect(tokensToLiters(0)).toBe(0)
  })

  it('scales with the water factor', () => {
    expect(tokensToLiters(500, 2)).toBe(1)
    expect(tokensToLiters(1000, 0.1)).toBeCloseTo(0.1)
  })

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])('rejects invalid token counts (%s)', (tokens) => {
    expect(() => tokensToLiters(tokens)).toThrow(RangeError)
  })

  it.each([0, -1, Number.NaN])('rejects invalid factors (%s)', (factor) => {
    expect(() => tokensToLiters(1, factor)).toThrow(RangeError)
  })
})

describe('resolveTier', () => {
  it('shows an empty drop for zero or negative volumes', () => {
    expect(resolveTier(0)).toEqual({ index: 0, fill: 0 })
    expect(resolveTier(-5)).toEqual({ index: 0, fill: 0 })
  })

  it('fills a container exactly to 100 % at its volume', () => {
    expect(resolveTier(0.5)).toEqual({ index: index('small-bottle'), fill: 1 })
  })

  it('tolerates floating-point noise at a tier boundary', () => {
    expect(resolveTier(500 * 0.001 * (1 + 1e-12)).index).toBe(index('small-bottle'))
  })

  it('moves to the next container once the previous overflows', () => {
    const position = resolveTier(0.51)
    expect(position.index).toBe(index('bottle'))
    expect(position.fill).toBeCloseTo(0.51 / 1.5)
  })

  it('reports 0.42 of an Olympic pool for 1.05 million litres', () => {
    const position = resolveTier(1_050_000)
    expect(position.index).toBe(index('olympic-pool'))
    expect(position.fill).toBeCloseTo(0.42)
  })

  it('keeps growing past the last tier', () => {
    expect(resolveTier(EARTH * 3)).toEqual({ index: TIERS.length - 1, fill: 3 })
  })

  it('throws on NaN instead of silently drawing nothing', () => {
    expect(() => resolveTier(Number.NaN)).toThrow(RangeError)
  })

  it('requires at least one tier', () => {
    expect(() => resolveTier(1, [])).toThrow(RangeError)
  })

  describe('properties', () => {
    const volume = fc.double({ min: 1e-9, max: EARTH, noNaN: true })

    it('always picks the smallest container that holds the volume', () => {
      fc.assert(
        fc.property(volume, (liters) => {
          const { index: i, fill } = resolveTier(liters)
          expect(fill).toBeGreaterThan(0)
          expect(fill).toBeLessThanOrEqual(1)
          expect(TIERS[i]!.volumeLiters * (1 + 1e-9)).toBeGreaterThanOrEqual(liters)
          if (i > 0) expect(TIERS[i - 1]!.volumeLiters).toBeLessThan(liters)
        }),
      )
    })

    it('never moves backwards as the volume grows', () => {
      fc.assert(
        fc.property(volume, volume, (a, b) => {
          const [low, high] = a <= b ? [a, b] : [b, a]
          expect(resolveTier(low).index).toBeLessThanOrEqual(resolveTier(high).index)
        }),
      )
    })
  })
})

describe('tokensToFillTier', () => {
  it('returns the token count that exactly fills a container', () => {
    expect(tokensToFillTier(index('cup'))).toBe(250)
    expect(tokensToFillTier(index('olympic-pool'))).toBe(2_500_000_000)
  })

  it('returns null when a tier holds less than one token of water', () => {
    expect(tokensToFillTier(index('drop'))).toBeNull()
    expect(tokensToFillTier(index('drop'), WATER_FACTOR.min)).toBeNull()
  })

  it('throws for an unknown tier', () => {
    expect(() => tokensToFillTier(99)).toThrow(RangeError)
  })

  it('lands on the requested tier (never the next one) for any factor', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: TIERS.length - 1 }),
        fc.double({ min: WATER_FACTOR.min, max: WATER_FACTOR.max, noNaN: true }),
        (tierIndex, factor) => {
          const tokens = tokensToFillTier(tierIndex, factor)
          if (tokens === null) return
          const position = resolveTier(tokensToLiters(tokens, factor))
          expect(position.index).toBe(tierIndex)
          // Whole tokens: the fill can only miss 100 % by less than one token's worth.
          expect(position.fill).toBeGreaterThanOrEqual(tokens / (tokens + 1) - 1e-12)
        },
      ),
    )
  })
})

describe('largestTierAtMost', () => {
  it('finds the biggest container that fits inside the volume', () => {
    expect(largestTierAtMost(46.5)).toBe(index('jug'))
    expect(largestTierAtMost(15)).toBe(index('bucket'))
  })

  it('returns -1 below a single drop', () => {
    expect(largestTierAtMost(0.00001)).toBe(-1)
  })
})
