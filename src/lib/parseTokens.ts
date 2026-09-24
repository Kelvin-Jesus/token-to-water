import { TOKEN_LIMITS } from '@/constants/scales'
import type { Locale } from '@/types'

export type TokenParseError = 'empty' | 'invalid' | 'negative' | 'too-large'
export type TokenParseResult = { ok: true; value: number } | { ok: false; error: TokenParseError }

/**
 * Magnitude shorthands people actually type: "15T", "2.5k", "1,5 mi".
 * Longest first so "mil" (pt-BR thousand) wins over "mi" (pt-BR million) and "m".
 */
const SUFFIXES: ReadonlyArray<readonly [suffix: string, multiplier: number]> = [
  ['quatri', 1e15],
  ['tri', 1e12],
  ['mil', 1e3],
  ['qa', 1e15],
  ['tn', 1e12],
  ['bi', 1e9],
  ['bn', 1e9],
  ['mi', 1e6],
  ['q', 1e15],
  ['t', 1e12],
  ['b', 1e9],
  ['m', 1e6],
  ['k', 1e3],
]

// Spaces, NBSP / narrow NBSP (French-style grouping), underscores and Swiss apostrophes are never significant.
const IGNORABLE = /[\s_\u00a0\u202f'\u2019]/g
const SCIENTIFIC = /^(?:\d+\.?\d*|\.\d+)e[+-]?\d+$/
const NUMERIC = /^[\d.,]*\d[\d.,]*$/

interface Separators {
  readonly group: string
  readonly decimal: string
}

const separatorCache = new Map<Locale, Separators>()

export function getSeparators(locale: Locale): Separators {
  const cached = separatorCache.get(locale)
  if (cached) return cached
  const parts = new Intl.NumberFormat(locale).formatToParts(1234567.5)
  const separators = {
    group: parts.find((part) => part.type === 'group')?.value ?? ',',
    decimal: parts.find((part) => part.type === 'decimal')?.value ?? '.',
  }
  separatorCache.set(locale, separators)
  return separators
}

function count(text: string, char: string): number {
  return text.split(char).length - 1
}

/**
 * Interpret "." and "," the way a reader in `locale` would, while still
 * accepting the other convention when it is unambiguous (e.g. "1,000,000"
 * pasted into a pt-BR session).
 */
function parseLocalizedNumber(text: string, locale: Locale, hasSuffix: boolean): number | null {
  if (!NUMERIC.test(text)) return null
  const dots = count(text, '.')
  const commas = count(text, ',')
  let normalized: string

  if (dots > 0 && commas > 0) {
    // Mixed separators: whichever comes last is the decimal point.
    const decimal = text.lastIndexOf('.') > text.lastIndexOf(',') ? '.' : ','
    if (count(text, decimal) > 1) return null
    const group = decimal === '.' ? ',' : '.'
    normalized = text.split(group).join('').replace(decimal, '.')
  } else if (dots + commas === 0) {
    normalized = text
  } else {
    const separator = dots > 0 ? '.' : ','
    if (dots + commas > 1) {
      normalized = text.split(separator).join('')
    } else {
      const { decimal } = getSeparators(locale)
      const digitsAfter = text.length - text.indexOf(separator) - 1
      // A lone locale *group* separator followed by exactly three digits is grouping ("1.500" in pt-BR,
      // "1,500" in en). Anything else — or any separator before a magnitude suffix — is a decimal point.
      const isGrouping = separator !== decimal && !hasSuffix && digitsAfter === 3 && text.indexOf(separator) > 0
      normalized = isGrouping ? text.replace(separator, '') : text.replace(separator, '.')
    }
  }

  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}

export function parseTokenInput(raw: string, locale: Locale): TokenParseResult {
  let text = raw.trim().toLowerCase().replace(IGNORABLE, '')
  if (text === '') return { ok: false, error: 'empty' }

  text = text.replace(/tokens?$/, '')
  const negative = text.startsWith('-') || text.startsWith('−')
  if (negative || text.startsWith('+')) text = text.slice(1)

  let multiplier = 1
  for (const [suffix, value] of SUFFIXES) {
    if (text.endsWith(suffix) && text.length > suffix.length) {
      multiplier = value
      text = text.slice(0, -suffix.length)
      break
    }
  }

  const value = SCIENTIFIC.test(text) ? Number(text) : parseLocalizedNumber(text, locale, multiplier !== 1)
  if (value === null || !Number.isFinite(value)) return { ok: false, error: 'invalid' }
  if (negative && value > 0) return { ok: false, error: 'negative' }

  const tokens = Math.round(value * multiplier)
  if (!Number.isFinite(tokens) || tokens > TOKEN_LIMITS.max) return { ok: false, error: 'too-large' }
  return { ok: true, value: tokens }
}

/**
 * Live "1,000,000"-style grouping while typing, keeping the caret next to the
 * same digit. Only plain integers are touched: once someone types a decimal
 * separator or a suffix ("2.5k"), the text is left alone until blur so their
 * keystrokes are never rewritten under them.
 */
export function formatDigitsWithCaret(
  raw: string,
  caret: number,
  locale: Locale,
): { text: string; caret: number } | null {
  const { group } = getSeparators(locale)
  const withoutGroups = raw.split(group).join('').replace(IGNORABLE, '')
  if (!/^\d*$/.test(withoutGroups)) return null

  const digitsBeforeCaret = raw.slice(0, caret).replace(/\D/g, '').length
  const leadingZeros = withoutGroups.length - withoutGroups.replace(/^0+(?=\d)/, '').length
  const digits = withoutGroups.slice(leadingZeros)
  if (digits === '') return { text: '', caret: 0 }

  // BigInt keeps 25-digit values exact; Number would round them.
  const text = new Intl.NumberFormat(locale).format(BigInt(digits))
  const targetDigits = Math.max(0, digitsBeforeCaret - leadingZeros)
  let position = 0
  let seen = 0
  while (position < text.length && seen < targetDigits) {
    if (/\d/.test(text[position]!)) seen++
    position++
  }
  return { text, caret: position }
}
