import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { TIERS } from '@/constants/scales'
import type { Equivalence, TierId } from '@/types'
import { describeEquivalence } from './equivalence'

const tier = (id: TierId) => TIERS.find((candidate) => candidate.id === id)!
const EARTH = tier('earth').volumeLiters

/** Compact, readable shape for assertions: [[tierId, count], …]. */
function summarize(equivalence: Equivalence) {
  switch (equivalence.kind) {
    case 'empty':
      return { kind: 'empty' }
    case 'fraction':
      return { kind: 'fraction', tier: equivalence.tier.id, fraction: equivalence.fraction }
    case 'count':
      return {
        kind: 'count',
        terms: equivalence.terms.map((term) => [term.tier.id, term.count]),
        approximate: equivalence.approximate,
      }
    case 'multiple':
      return { kind: 'multiple', tier: equivalence.tier.id, count: equivalence.count, approximate: equivalence.approximate }
  }
}

describe('describeEquivalence', () => {
  it('is empty for no water', () => {
    expect(describeEquivalence(0)).toEqual({ kind: 'empty' })
    expect(describeEquivalence(-1)).toEqual({ kind: 'empty' })
  })

  it('describes less than a drop as a fraction of one', () => {
    const result = summarize(describeEquivalence(0.00002))
    expect(result).toMatchObject({ kind: 'fraction', tier: 'drop' })
    expect(result.fraction).toBeCloseTo(0.4)
  })

  it('says exactly one small bottle for 500 mL', () => {
    expect(summarize(describeEquivalence(0.5))).toEqual({ kind: 'count', terms: [['small-bottle', 1]], approximate: false })
  })

  it('combines two containers when both are whole numbers', () => {
    expect(summarize(describeEquivalence(16.5))).toEqual({
      kind: 'count',
      terms: [
        ['bucket', 1],
        ['bottle', 1],
      ],
      approximate: false,
    })
  })

  it('rounds the second term and flags the result as approximate', () => {
    // 46.5 L → 2 × 20 L jugs + 6.5 L ≈ 4 × 1.5 L bottles (6 L).
    expect(summarize(describeEquivalence(46.5))).toEqual({
      kind: 'count',
      terms: [
        ['jug', 2],
        ['bottle', 4],
      ],
      approximate: true,
    })
  })

  it('drops a negligible remainder but still marks it approximate', () => {
    expect(summarize(describeEquivalence(15.001))).toEqual({ kind: 'count', terms: [['bucket', 1]], approximate: true })
  })

  it('switches to a decimal count instead of an unwieldy second term', () => {
    // 0.49 L = 1 glass + 0.24 L, which would be "16 tablespoons": use 1.96 glasses instead.
    const result = summarize(describeEquivalence(0.49))
    expect(result).toMatchObject({ kind: 'multiple', tier: 'cup', approximate: true })
    expect(result.count).toBeCloseTo(1.96)
  })

  it('uses a decimal count of drops when the remainder is smaller than any container', () => {
    const result = summarize(describeEquivalence(0.00007))
    expect(result).toMatchObject({ kind: 'multiple', tier: 'drop', approximate: true })
    expect(result.count).toBeCloseTo(1.4)
  })

  it('uses a decimal count from ten units up', () => {
    const result = summarize(describeEquivalence(1_050_000))
    expect(result).toMatchObject({ kind: 'multiple', tier: 'large-pool', approximate: true })
    expect(result.count).toBeCloseTo(10.5)
  })

  it('treats a whole Olympic pool as exact', () => {
    expect(summarize(describeEquivalence(2_500_000))).toEqual({ kind: 'count', terms: [['olympic-pool', 1]], approximate: false })
  })

  it('describes unique bodies of water as multiples, never "2 Mediterraneans and a lake"', () => {
    expect(summarize(describeEquivalence(tier('mediterranean').volumeLiters))).toEqual({
      kind: 'multiple',
      tier: 'mediterranean',
      count: 1,
      approximate: false,
    })
    expect(summarize(describeEquivalence(EARTH * 2))).toEqual({ kind: 'multiple', tier: 'earth', count: 2, approximate: false })
  })

  it('throws on NaN', () => {
    expect(() => describeEquivalence(Number.NaN)).toThrow(RangeError)
  })

  describe('properties', () => {
    const volume = fc.double({ min: 1e-8, max: EARTH * 10, noNaN: true })

    it('decimal multiples reproduce the volume exactly', () => {
      fc.assert(
        fc.property(volume, (liters) => {
          const result = describeEquivalence(liters)
          if (result.kind !== 'multiple') return
          expect(result.count * result.tier.volumeLiters).toBeCloseTo(liters, 6 - Math.floor(Math.log10(liters)))
        }),
      )
    })

    it('whole-number descriptions stay within 25 % of the volume and are flagged when inexact', () => {
      fc.assert(
        fc.property(volume, (liters) => {
          const result = describeEquivalence(liters)
          if (result.kind !== 'count') return
          const total = result.terms.reduce((sum, term) => sum + term.count * term.tier.volumeLiters, 0)
          const error = Math.abs(total - liters) / liters
          expect(error).toBeLessThan(0.25)
          if (error > 1e-6) expect(result.approximate).toBe(true)
          for (const term of result.terms) {
            expect(Number.isInteger(term.count)).toBe(true)
            expect(term.count).toBeGreaterThanOrEqual(1)
            expect(term.count).toBeLessThan(10)
          }
        }),
      )
    })

    it('orders two terms from larger to smaller container', () => {
      fc.assert(
        fc.property(volume, (liters) => {
          const result = describeEquivalence(liters)
          if (result.kind !== 'count' || result.terms.length < 2) return
          expect(result.terms[0].tier.volumeLiters).toBeGreaterThan(result.terms[1]!.tier.volumeLiters)
        }),
      )
    })
  })
})
