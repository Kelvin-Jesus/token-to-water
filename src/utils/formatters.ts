import type { Locale } from '@/types'

/**
 * Locale-aware number, volume, mass, length and duration formatting.
 *
 * Intl stops at "trillion" in compact notation, but this app routinely shows
 * values up to 10²⁵, so the large-number words are provided here per locale.
 */

const formatterCache = new Map<string, Intl.NumberFormat>()

/** Intl.NumberFormat construction is surprisingly expensive; cache one per (locale, options). */
export function numberFormat(locale: Locale, options: Intl.NumberFormatOptions = {}): Intl.NumberFormat {
  const key = `${locale}|${JSON.stringify(options)}`
  let formatter = formatterCache.get(key)
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, options)
    formatterCache.set(key, formatter)
  }
  return formatter
}

/** Short-scale words for 10³ⁿ, n = 1..8 (thousand … septillion). Brazil uses the short scale too. */
const SCALE_WORDS: Record<Locale, { short: readonly string[]; long: readonly (readonly [one: string, other: string])[] }> = {
  en: {
    short: ['K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp'],
    long: [
      ['thousand', 'thousand'],
      ['million', 'million'],
      ['billion', 'billion'],
      ['trillion', 'trillion'],
      ['quadrillion', 'quadrillion'],
      ['quintillion', 'quintillion'],
      ['sextillion', 'sextillion'],
      ['septillion', 'septillion'],
    ],
  },
  'pt-BR': {
    short: [' mil', ' mi', ' bi', ' tri', ' quatri', ' quint', ' sext', ' sept'],
    long: [
      ['mil', 'mil'],
      ['milhão', 'milhões'],
      ['bilhão', 'bilhões'],
      ['trilhão', 'trilhões'],
      ['quatrilhão', 'quatrilhões'],
      ['quintilhão', 'quintilhões'],
      ['sextilhão', 'sextilhões'],
      ['septilhão', 'septilhões'],
    ],
  },
}

const SUPERSCRIPT_DIGITS = '⁰¹²³⁴⁵⁶⁷⁸⁹'

function superscript(exponent: number): string {
  const digits = String(Math.abs(exponent))
    .split('')
    .map((digit) => SUPERSCRIPT_DIGITS[Number(digit)])
    .join('')
  return exponent < 0 ? `⁻${digits}` : digits
}

/** "10¹⁵": language-neutral labels for the far end of the slider. */
export function formatPowerOfTen(exponent: number): string {
  return `10${superscript(exponent)}`
}

export function formatInteger(value: number, locale: Locale): string {
  return numberFormat(locale, { maximumFractionDigits: 0 }).format(Math.round(value))
}

/** Grouped token count, exact to the unit: "1,000,000". */
export function formatTokens(tokens: number, locale: Locale): string {
  return formatInteger(tokens, locale)
}

/** General-purpose number with at most `significant` significant digits and grouping: "12.5", "1,230". */
export function formatNumber(value: number, locale: Locale, significant = 3): string {
  if (value !== 0 && Math.abs(value) >= 10 ** significant) return formatInteger(value, locale)
  return numberFormat(locale, { maximumSignificantDigits: significant }).format(value)
}

/**
 * Compact number that keeps working past a trillion: "15T" / "15 tri" (short)
 * or "15 trillion" / "15 trilhões" (long). Beyond septillions it falls back to
 * scientific notation ("1.2 × 10²⁸").
 */
export function formatCompact(value: number, locale: Locale, style: 'short' | 'long' = 'short', significant = 3): string {
  const absolute = Math.abs(value)
  if (absolute < 1000) return formatNumber(value, locale, significant)

  // Rounding first avoids "1000K" for 999,999: decide the group from the rounded value.
  const rounded = Number(absolute.toPrecision(significant))
  const group = Math.floor(Math.log10(rounded) / 3)
  const words = SCALE_WORDS[locale]
  if (group > words.long.length) {
    const exponent = Math.floor(Math.log10(rounded))
    const mantissa = formatNumber(rounded / 10 ** exponent, locale, significant)
    return `${value < 0 ? '−' : ''}${mantissa} × ${formatPowerOfTen(exponent)}`
  }

  const mantissaValue = rounded / 1000 ** group
  const mantissa = formatNumber(mantissaValue, locale, significant)
  const sign = value < 0 ? '−' : ''
  if (style === 'short') return `${sign}${mantissa}${words.short[group - 1]}`
  const [one, other] = words.long[group - 1]!
  // Portuguese keeps the singular below 2 ("1,5 milhão"); English scale words never inflect here.
  return `${sign}${mantissa} ${mantissaValue < 2 ? one : other}`
}

/**
 * Compact long form ready to precede a noun: "15 trillion" (en), but
 * "15 trilhões de" (pt-BR) — Portuguese scale nouns from milhão up take "de"
 * before what they count ("2 milhões de tokens"), while "mil" does not ("2 mil tokens").
 */
export function formatCompactCount(value: number, locale: Locale): string {
  const compact = formatCompact(value, locale, 'long')
  return locale === 'pt-BR' && /(ão|ões)$/.test(compact) ? `${compact} de` : compact
}

export interface FormattedQuantity {
  /** Number part, e.g. "2,500" or "3.75 million". */
  readonly value: string
  readonly unit: string
  /** Value and unit joined with a no-break space so they never wrap apart. */
  readonly text: string
}

function quantity(value: string, unit: string): FormattedQuantity {
  return { value, unit, text: `${value}\u00a0${unit}` }
}

const LITERS_PER_M3 = 1_000
const LITERS_PER_KM3 = 1e12

/**
 * Smart metric volume: mL below a litre, L up to 1,000 m³ (people think of
 * trucks and pools in litres), m³ up to a cubic kilometre, then km³.
 */
export function formatVolume(liters: number, locale: Locale): FormattedQuantity {
  if (!Number.isFinite(liters) || liters <= 0) return quantity(formatNumber(0, locale), 'L')
  if (liters < 1) return quantity(formatNumber(liters * 1000, locale), 'mL')
  if (liters < 1_000_000) return quantity(formatNumber(liters, locale), 'L')
  if (liters < LITERS_PER_KM3) {
    const cubicMeters = liters / LITERS_PER_M3
    return quantity(cubicMeters < 1e6 ? formatNumber(cubicMeters, locale) : formatCompact(cubicMeters, locale, 'long'), 'm³')
  }
  const cubicKilometers = liters / LITERS_PER_KM3
  return quantity(
    cubicKilometers < 1e6 ? formatNumber(cubicKilometers, locale) : formatCompact(cubicKilometers, locale, 'long'),
    'km³',
  )
}

/** Mass of the water (1 L ≈ 1 kg): g, kg, then tonnes. */
export function formatMass(kilograms: number, locale: Locale): FormattedQuantity {
  if (!Number.isFinite(kilograms) || kilograms <= 0) return quantity(formatNumber(0, locale), 'kg')
  if (kilograms < 1) return quantity(formatNumber(kilograms * 1000, locale), 'g')
  if (kilograms < 1000) return quantity(formatNumber(kilograms, locale), 'kg')
  const tonnes = kilograms / 1000
  return quantity(tonnes < 1e6 ? formatNumber(tonnes, locale) : formatCompact(tonnes, locale, 'long'), 't')
}

/** Scale-bar label: mm, cm, m, km. */
export function formatLength(meters: number, locale: Locale): string {
  if (meters < 0.01) return quantity(formatNumber(meters * 1000, locale), 'mm').text
  if (meters < 1) return quantity(formatNumber(meters * 100, locale), 'cm').text
  if (meters < 1000) return quantity(formatNumber(meters, locale), 'm').text
  const kilometers = meters / 1000
  return quantity(kilometers < 1e6 ? formatNumber(kilometers, locale) : formatCompact(kilometers, locale, 'long'), 'km').text
}

/** "42%", "0.083%", "<0.001%" — never rounds a non-zero share to "0%". */
export function formatPercent(fraction: number, locale: Locale): string {
  if (fraction > 0 && fraction < 0.00001) {
    return `<${numberFormat(locale, { style: 'percent', maximumFractionDigits: 3 }).format(0.00001)}`
  }
  if (fraction > 0 && fraction < 0.01) {
    return numberFormat(locale, { style: 'percent', maximumSignificantDigits: 2 }).format(fraction)
  }
  // Floor near the top so an almost-full container never claims "100%" — but treat floating-point
  // residue (0.99999…) as full.
  const display = fraction >= 0.9999 && fraction < 1 ? 1 : fraction < 1 && fraction > 0.995 ? 0.99 : fraction
  return numberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(display)
}

/** Fractions as decimals ("0.42", "0.0083") for "0.42 of an Olympic pool". */
export function formatFraction(fraction: number, locale: Locale): string {
  if (fraction >= 0.1) return numberFormat(locale, { maximumFractionDigits: 2 }).format(fraction)
  return numberFormat(locale, { maximumSignificantDigits: 2 }).format(fraction)
}

type DurationUnit = 'second' | 'minute' | 'hour' | 'day' | 'year'

/** ~13.8 billion years, in days. */
export const AGE_OF_UNIVERSE_DAYS = 13.8e9 * 365.25

/**
 * Localised duration with the most readable unit ("3 days", "4.1 years",
 * "12 million years"). Returns null past the age of the universe, where the
 * caller shows a sentence instead of a number.
 */
export function formatDuration(days: number, locale: Locale): string | null {
  if (!Number.isFinite(days) || days < 0) throw new RangeError(`invalid duration: ${days}`)
  if (days > AGE_OF_UNIVERSE_DAYS) return null

  let unit: DurationUnit = 'day'
  let value = days
  if (days < 1 / 1440) {
    unit = 'second'
    value = days * 86_400
  } else if (days < 1 / 24) {
    unit = 'minute'
    value = days * 24 * 60
  } else if (days < 1) {
    unit = 'hour'
    value = days * 24
  } else if (days >= 365.25) {
    unit = 'year'
    value = days / 365.25
  }

  return numberFormat(locale, {
    style: 'unit',
    unit,
    unitDisplay: 'long',
    maximumSignificantDigits: value < 1 ? 1 : 2,
    ...(value >= 1e6 ? { notation: 'compact', compactDisplay: 'long' } : {}),
  }).format(value)
}
