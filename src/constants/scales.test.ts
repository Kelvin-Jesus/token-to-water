import { describe, expect, it } from 'vitest'
import { TIER_IDS } from '@/types'
import { DEFAULT_TOKENS, LITERS_PER_TOKEN, PRESETS, THIS_PROJECT_TOKENS, TIERS, TOKEN_LIMITS, WATER_FACTOR } from './scales'

describe('conversion constants', () => {
  it('uses 1 mL per token as the reference rate', () => {
    expect(LITERS_PER_TOKEN).toBe(0.001)
  })

  it('makes one token worth about 20 drops', () => {
    expect(LITERS_PER_TOKEN / TIERS[0].volumeLiters).toBeCloseTo(20)
  })

  it('makes the default prompt exactly one small water bottle', () => {
    const bottle = TIERS.find((tier) => tier.id === 'small-bottle')!
    expect(DEFAULT_TOKENS * LITERS_PER_TOKEN).toBe(bottle.volumeLiters)
  })

  it('keeps the water factor range around the default', () => {
    expect(WATER_FACTOR.min).toBeLessThan(WATER_FACTOR.default)
    expect(WATER_FACTOR.max).toBeGreaterThan(WATER_FACTOR.default)
  })

  it('lets the slider reach past the last tier at the default rate', () => {
    const earth = TIERS.at(-1)!
    expect(TOKEN_LIMITS.max * LITERS_PER_TOKEN).toBeGreaterThan(earth.volumeLiters)
  })
})

describe('TIERS', () => {
  it('lists all 20 tiers in ladder order', () => {
    expect(TIERS).toHaveLength(20)
    expect(TIERS.map((tier) => tier.id)).toEqual([...TIER_IDS])
  })

  it('uses the volumes from the brief', () => {
    const volumes = Object.fromEntries(TIERS.map((tier) => [tier.id, tier.volumeLiters]))
    expect(volumes).toMatchObject({
      drop: 0.00005,
      tablespoon: 0.015,
      cup: 0.25,
      'small-bottle': 0.5,
      bottle: 1.5,
      bucket: 15,
      jug: 20,
      drum: 200,
      'small-tank': 500,
      tank: 1000,
      'small-truck': 5000,
      'large-truck': 15_000,
      'residential-pool': 35_000,
      'large-pool': 100_000,
      'olympic-pool': 2_500_000,
      'small-lake': 100_000_000,
      amazon: 18_000_000_000_000,
      earth: 1.386e21,
    })
  })

  it('stores ocean volumes in litres, matching published km³ figures (ADR 0001)', () => {
    const KM3 = 1e12
    const volume = (id: string) => TIERS.find((tier) => tier.id === id)!.volumeLiters
    expect(volume('mediterranean') / KM3).toBeCloseTo(3.75e6)
    expect(volume('atlantic') / KM3).toBeCloseTo(3.1e8)
    // Sanity: the Atlantic holds roughly a fifth to a quarter of all water on Earth.
    expect(volume('atlantic') / volume('earth')).toBeGreaterThan(0.2)
    expect(volume('atlantic') / volume('earth')).toBeLessThan(0.25)
  })

  it('is strictly increasing in volume', () => {
    for (let i = 1; i < TIERS.length; i++) {
      expect(TIERS[i]!.volumeLiters).toBeGreaterThan(TIERS[i - 1]!.volumeLiters)
    }
  })

  it('keeps every nominal volume inside its documented range', () => {
    for (const tier of TIERS) {
      if (!('range' in tier)) continue
      expect(tier.range.min).toBeLessThanOrEqual(tier.volumeLiters)
      expect(tier.range.max).toBeGreaterThanOrEqual(tier.volumeLiters)
    }
  })

  it('treats only unique bodies of water as uncountable', () => {
    expect(TIERS.filter((tier) => !tier.countable).map((tier) => tier.id)).toEqual([
      'amazon',
      'mediterranean',
      'atlantic',
      'earth',
    ])
  })

  it('gives every tier a name, emoji and description', () => {
    for (const tier of TIERS) {
      expect(tier.name.trim()).not.toBe('')
      expect(tier.icon.trim()).not.toBe('')
      expect(tier.description.length).toBeGreaterThan(10)
    }
  })
})

describe('PRESETS', () => {
  it('matches the four quick presets from the brief, plus the cost of building this app', () => {
    expect(Object.fromEntries(PRESETS.map((preset) => [preset.id, preset.tokens]))).toEqual({
      'short-query': 150,
      'extended-chat': 10_000,
      'book-summary': 100_000,
      'frontier-training': 15e12,
      'this-project': THIS_PROJECT_TOKENS,
    })
  })

  it('records a measured, plausible token count for building this app', () => {
    // Summed from the Claude Code session transcript (scripts/count-session-tokens.mjs).
    expect(Number.isInteger(THIS_PROJECT_TOKENS)).toBe(true)
    expect(THIS_PROJECT_TOKENS).toBeGreaterThan(1e6)
    expect(THIS_PROJECT_TOKENS).toBeLessThan(1e10)
  })

  it('stays within the token limits', () => {
    for (const preset of PRESETS) expect(preset.tokens).toBeLessThanOrEqual(TOKEN_LIMITS.max)
  })
})
