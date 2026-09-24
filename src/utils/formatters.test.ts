import { describe, expect, it } from 'vitest'
import {
  AGE_OF_UNIVERSE_DAYS,
  formatCompact,
  formatCompactCount,
  formatDuration,
  formatFraction,
  formatLength,
  formatMass,
  formatNumber,
  formatPercent,
  formatPowerOfTen,
  formatTokens,
  formatVolume,
  numberFormat,
} from './formatters'

/** Intl output uses a no-break space between value and unit; normalise for readable expectations. */
const plain = (text: string) => text.replace(/\u00a0|\u202f/g, ' ')

describe('formatTokens', () => {
  it('groups digits by locale', () => {
    expect(formatTokens(1_000_000, 'en')).toBe('1,000,000')
    expect(formatTokens(1_000_000, 'pt-BR')).toBe('1.000.000')
  })

  it('prints huge counts in full', () => {
    expect(formatTokens(1.386e24, 'en')).toBe('1,386,000,000,000,000,000,000,000')
  })
})

describe('formatNumber', () => {
  it('keeps three significant digits for small values and groups large ones', () => {
    expect(formatNumber(12.345, 'en')).toBe('12.3')
    expect(formatNumber(0.04999, 'en')).toBe('0.05')
    expect(formatNumber(2500, 'en')).toBe('2,500')
    expect(formatNumber(12.5, 'pt-BR')).toBe('12,5')
  })

  it('reuses cached Intl formatters', () => {
    expect(numberFormat('en', { maximumFractionDigits: 1 })).toBe(numberFormat('en', { maximumFractionDigits: 1 }))
  })
})

describe('formatCompact', () => {
  it.each([
    [999, 'en', 'short', '999'],
    [1500, 'en', 'short', '1.5K'],
    [15e12, 'en', 'short', '15T'],
    [15e12, 'en', 'long', '15 trillion'],
    [2e15, 'en', 'long', '2 quadrillion'],
    [1.386e24, 'en', 'long', '1.39 septillion'],
    [1.5e6, 'pt-BR', 'long', '1,5 milhão'],
    [2e6, 'pt-BR', 'long', '2 milhões'],
    [15e12, 'pt-BR', 'short', '15 tri'],
    [3e9, 'pt-BR', 'long', '3 bilhões'],
  ] as const)('%d (%s, %s) → %s', (value, locale, style, expected) => {
    expect(formatCompact(value, locale, style)).toBe(expected)
  })

  it('does not print "1000K" when rounding crosses a group boundary', () => {
    expect(formatCompact(999_999, 'en')).toBe('1M')
  })

  it('falls back to scientific notation beyond septillions', () => {
    expect(formatCompact(1.2e28, 'en')).toBe('1.2 × 10²⁸')
  })

  it('handles negative numbers', () => {
    expect(formatCompact(-2500, 'en')).toBe('−2.5K')
  })
})

describe('formatCompactCount', () => {
  it('adds the Portuguese "de" after scale nouns, not after "mil"', () => {
    expect(formatCompactCount(15e12, 'pt-BR')).toBe('15 trilhões de')
    expect(formatCompactCount(1.5e6, 'pt-BR')).toBe('1,5 milhão de')
    expect(formatCompactCount(2500, 'pt-BR')).toBe('2,5 mil')
    expect(formatCompactCount(150, 'pt-BR')).toBe('150')
    expect(formatCompactCount(15e12, 'en')).toBe('15 trillion')
  })
})

describe('formatPowerOfTen', () => {
  it('uses superscript digits', () => {
    expect(formatPowerOfTen(15)).toBe('10¹⁵')
    expect(formatPowerOfTen(-3)).toBe('10⁻³')
  })
})

describe('formatVolume', () => {
  it.each([
    [0, '0 L'],
    [0.00005, '0.05 mL'],
    [0.25, '250 mL'],
    [1.5, '1.5 L'],
    [15_000, '15,000 L'],
    [100_000, '100,000 L'],
    [2_500_000, '2,500 m³'],
    [100_000_000, '100,000 m³'],
    [1.5e10, '15 million m³'],
    [18e12, '18 km³'],
    [3.75e18, '3.75 million km³'],
    [1.386e21, '1.39 billion km³'],
  ])('%d L → %s', (liters, expected) => {
    expect(plain(formatVolume(liters, 'en').text)).toBe(expected)
  })

  it('splits value and unit for styling and joins them with a no-break space', () => {
    expect(formatVolume(1.5, 'pt-BR')).toEqual({ value: '1,5', unit: 'L', text: '1,5 L' })
  })

  it('treats invalid input as empty', () => {
    expect(plain(formatVolume(Number.NaN, 'en').text)).toBe('0 L')
  })
})

describe('formatMass', () => {
  it.each([
    [0, '0 kg'],
    [0.5, '500 g'],
    [15, '15 kg'],
    [2500, '2.5 t'],
    [1.386e21, '1.39 quintillion t'],
  ])('%d kg → %s', (kilograms, expected) => {
    expect(plain(formatMass(kilograms, 'en').text)).toBe(expected)
  })
})

describe('formatLength', () => {
  it.each([
    [0.005, '5 mm'],
    [0.2, '20 cm'],
    [50, '50 m'],
    [2000, '2 km'],
    [5e9, '5 million km'],
  ])('%d m → %s', (meters, expected) => {
    expect(plain(formatLength(meters, 'en'))).toBe(expected)
  })
})

describe('formatPercent', () => {
  it('rounds normal fills to whole percent', () => {
    expect(formatPercent(0.42, 'en')).toBe('42%')
    expect(formatPercent(0.42, 'pt-BR')).toBe('42%')
  })

  it('keeps small fills visible instead of "0%"', () => {
    expect(formatPercent(0.000083, 'en')).toBe('0.0083%')
    expect(formatPercent(0.000001, 'en')).toBe('<0.001%')
  })

  it('never shows a nearly full container as 100%', () => {
    expect(formatPercent(0.997, 'en')).toBe('99%')
  })

  it('treats floating-point residue as full', () => {
    expect(formatPercent(0.9999999999, 'en')).toBe('100%')
    expect(formatPercent(1, 'en')).toBe('100%')
  })
})

describe('formatFraction', () => {
  it('uses two decimals from 0.1 and two significant digits below', () => {
    expect(formatFraction(0.4242, 'en')).toBe('0.42')
    expect(formatFraction(0.0083, 'en')).toBe('0.0083')
    expect(formatFraction(0.42, 'pt-BR')).toBe('0,42')
  })
})

describe('formatDuration', () => {
  it.each([
    [0.5 / 86_400, '0.5 seconds'],
    [1 / 1440, '1 minute'],
    [0.25, '6 hours'],
    [3, '3 days'],
    [365.25 * 4.1, '4.1 years'],
    [365.25 * 12e6, '12 million years'],
  ])('%d days → %s', (days, expected) => {
    expect(formatDuration(days, 'en')).toBe(expected)
  })

  it('localises units', () => {
    expect(formatDuration(3, 'pt-BR')).toBe('3 dias')
  })

  it('returns null past the age of the universe', () => {
    expect(formatDuration(AGE_OF_UNIVERSE_DAYS * 2, 'en')).toBeNull()
  })

  it('rejects negative or non-finite durations', () => {
    expect(() => formatDuration(-1, 'en')).toThrow(RangeError)
    expect(() => formatDuration(Number.NaN, 'en')).toThrow(RangeError)
  })
})
