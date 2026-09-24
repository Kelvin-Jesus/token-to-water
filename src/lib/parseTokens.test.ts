import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { TOKEN_LIMITS } from '@/constants/scales'
import type { Locale } from '@/types'
import { formatDigitsWithCaret, getSeparators, parseTokenInput } from './parseTokens'

const ok = (value: number) => ({ ok: true, value })
const fail = (error: string) => ({ ok: false, error })

describe('getSeparators', () => {
  it('reads grouping and decimal marks from Intl', () => {
    expect(getSeparators('en')).toEqual({ group: ',', decimal: '.' })
    expect(getSeparators('pt-BR')).toEqual({ group: '.', decimal: ',' })
  })
})

describe('parseTokenInput', () => {
  it.each<[string, Locale, number]>([
    ['1000000', 'en', 1_000_000],
    ['1,000,000', 'en', 1_000_000],
    ['1.000.000', 'pt-BR', 1_000_000],
    ['  42  ', 'en', 42],
    ['1 000 000', 'en', 1_000_000],
    ['1 000', 'en', 1000],
    ['1_000', 'en', 1000],
    ['1,500', 'en', 1500],
    ['1.500', 'pt-BR', 1500],
    ['1.5', 'en', 2],
    ['1,5', 'pt-BR', 2],
    ['1,234.5', 'en', 1235],
    ['1.234,5', 'pt-BR', 1235],
    ['+7', 'en', 7],
    ['500 tokens', 'en', 500],
  ])('parses plain numbers: %j (%s) → %d', (input, locale, expected) => {
    expect(parseTokenInput(input, locale)).toEqual(ok(expected))
  })

  it.each<[string, Locale, number]>([
    ['2.5k', 'en', 2500],
    ['2,5k', 'pt-BR', 2500],
    ['2.5 mil', 'pt-BR', 2500],
    ['1.2M', 'en', 1_200_000],
    ['1,2 mi', 'pt-BR', 1_200_000],
    ['3b', 'en', 3e9],
    ['3 bi', 'pt-BR', 3e9],
    ['3bn', 'en', 3e9],
    ['15T', 'en', 15e12],
    ['15 tri', 'pt-BR', 15e12],
    ['2 qa', 'en', 2e15],
    ['1.5e13', 'en', 1.5e13],
    ['1E6', 'en', 1e6],
  ])('parses shorthand: %j (%s) → %d', (input, locale, expected) => {
    expect(parseTokenInput(input, locale)).toEqual(ok(expected))
  })

  it('reads a lone group separator before a suffix as a decimal point', () => {
    // In pt-BR "." groups thousands, but "1.5k" can only sensibly mean one and a half thousand.
    expect(parseTokenInput('1.5k', 'pt-BR')).toEqual(ok(1500))
  })

  it.each(['', '   '])('flags empty input (%j)', (input) => {
    expect(parseTokenInput(input, 'en')).toEqual(fail('empty'))
  })

  it.each(['abc', '12abc', '1.2.3,4.5', 'k', '--5', '1e', 'NaN', 'Infinity'])('rejects garbage: %j', (input) => {
    expect(parseTokenInput(input, 'en')).toEqual(fail('invalid'))
  })

  it.each(['-5', '−5', '-2k'])('rejects negative values: %j', (input) => {
    expect(parseTokenInput(input, 'en')).toEqual(fail('negative'))
  })

  it('accepts negative zero as zero', () => {
    expect(parseTokenInput('-0', 'en')).toEqual(ok(0))
  })

  it('rejects values above the limit', () => {
    expect(parseTokenInput('1e26', 'en')).toEqual(fail('too-large'))
    expect(parseTokenInput('99999999999 qa', 'en')).toEqual(fail('too-large'))
    expect(parseTokenInput('1e25', 'en')).toEqual(ok(TOKEN_LIMITS.max))
  })

  it('round-trips every formatted integer in both locales (property)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }), fc.constantFrom<Locale>('en', 'pt-BR'), (value, locale) => {
        const formatted = new Intl.NumberFormat(locale).format(value)
        expect(parseTokenInput(formatted, locale)).toEqual(ok(value))
      }),
    )
  })

  it('never throws, whatever is typed (property)', () => {
    fc.assert(
      fc.property(fc.string(), fc.constantFrom<Locale>('en', 'pt-BR'), (input, locale) => {
        const result = parseTokenInput(input, locale)
        if (result.ok) {
          expect(Number.isInteger(result.value)).toBe(true)
          expect(result.value).toBeGreaterThanOrEqual(0)
          expect(result.value).toBeLessThanOrEqual(TOKEN_LIMITS.max)
        }
      }),
    )
  })
})

describe('formatDigitsWithCaret', () => {
  it('groups digits and keeps the caret after the same digit', () => {
    // Typing the 4th digit at the end of "123" → "1,234", caret at the end.
    expect(formatDigitsWithCaret('1234', 4, 'en')).toEqual({ text: '1,234', caret: 5 })
    // Caret after "12" in "12345" stays after the "2" once grouped: "12,|345".
    expect(formatDigitsWithCaret('12345', 2, 'en')).toEqual({ text: '12,345', caret: 2 })
  })

  it('handles deletions that remove a separator', () => {
    // "1,234" with the comma deleted → "1234" → regrouped.
    expect(formatDigitsWithCaret('1234', 1, 'en')).toEqual({ text: '1,234', caret: 1 })
  })

  it('uses the locale grouping mark', () => {
    expect(formatDigitsWithCaret('1234567', 7, 'pt-BR')).toEqual({ text: '1.234.567', caret: 9 })
  })

  it('strips leading zeros without losing the caret', () => {
    expect(formatDigitsWithCaret('0012', 4, 'en')).toEqual({ text: '12', caret: 2 })
  })

  it('keeps 25-digit values exact', () => {
    expect(formatDigitsWithCaret('1234567890123456789012345', 25, 'en')?.text).toBe('1,234,567,890,123,456,789,012,345')
  })

  it('returns an empty field when every digit is deleted', () => {
    expect(formatDigitsWithCaret('', 0, 'en')).toEqual({ text: '', caret: 0 })
  })

  it.each([
    ['1.5', 'en'],
    ['1,5', 'pt-BR'],
    ['2k', 'en'],
    ['1e6', 'en'],
  ] as const)('leaves decimals and shorthand alone while typing (%j)', (input, locale) => {
    expect(formatDigitsWithCaret(input, input.length, locale)).toBeNull()
  })

  it('keeps the digit sequence and caret position consistent (property)', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[1-9]\d{0,20}$/), fc.nat(), fc.constantFrom<Locale>('en', 'pt-BR'), (digits, caretSeed, locale) => {
        const caret = caretSeed % (digits.length + 1)
        const result = formatDigitsWithCaret(digits, caret, locale)!
        expect(result.text.replace(/\D/g, '')).toBe(digits)
        expect(result.text.slice(0, result.caret).replace(/\D/g, '')).toBe(digits.slice(0, caret))
      }),
    )
  })
})
