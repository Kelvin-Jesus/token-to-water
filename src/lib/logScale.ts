import { TOKEN_LIMITS } from '@/constants/scales'
import { clamp } from './utils'

/**
 * Logarithmic slider mapping. A linear slider over 1 → 10²⁵ tokens would spend
 * all but its last pixel above a quadrillion; log space gives every order of
 * magnitude the same width.
 */

/** Slider resolution: 1000 steps over 25 decades ≈ 6 % change per keyboard step. */
export const SLIDER_STEPS = 1000

const LOG_MAX_TOKENS = Math.log10(TOKEN_LIMITS.max)

/** Position in [0, 1] of `value` on a log axis spanning [min, max] (both > 0). */
export function toLogPosition(value: number, min: number, max: number): number {
  if (!(min > 0) || !(max > min)) throw new RangeError(`invalid log range [${min}, ${max}]`)
  if (!(value > min)) return 0
  return clamp(Math.log10(value / min) / Math.log10(max / min), 0, 1)
}

export function fromLogPosition(position: number, min: number, max: number): number {
  if (!(min > 0) || !(max > min)) throw new RangeError(`invalid log range [${min}, ${max}]`)
  return min * (max / min) ** clamp(position, 0, 1)
}

/**
 * Round to `significant` digits, then to an integer. Slider-picked values then
 * read as "1,230,000" rather than "1,234,567" — a false precision nobody typed.
 */
export function roundToSignificant(value: number, significant = 3): number {
  if (!Number.isFinite(value) || value <= 0) return 0
  // Via toPrecision rather than divide/multiply: above 2^53 the arithmetic route
  // yields neighbours like 1.2299999999999999e17 that print with stray digits.
  return Number(value.toPrecision(significant))
}

export function tokensToSliderValue(tokens: number): number {
  // Zero tokens and one token share the left end: log(0) has no position.
  return Math.round(toLogPosition(Math.max(tokens, 1), 1, 10 ** LOG_MAX_TOKENS) * SLIDER_STEPS)
}

export function sliderValueToTokens(value: number): number {
  const raw = fromLogPosition(value / SLIDER_STEPS, 1, 10 ** LOG_MAX_TOKENS)
  return clamp(Math.round(roundToSignificant(raw, 3)), 1, TOKEN_LIMITS.max)
}
