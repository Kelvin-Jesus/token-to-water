import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { TOKEN_LIMITS } from '@/constants/scales'
import {
  fromLogPosition,
  roundToSignificant,
  SLIDER_STEPS,
  sliderValueToTokens,
  tokensToSliderValue,
  toLogPosition,
} from './logScale'

describe('toLogPosition / fromLogPosition', () => {
  it('maps each decade to an equal share of the axis', () => {
    expect(toLogPosition(1, 1, 100)).toBe(0)
    expect(toLogPosition(10, 1, 100)).toBeCloseTo(0.5)
    expect(toLogPosition(100, 1, 100)).toBe(1)
    expect(fromLogPosition(0.5, 0.1, 10)).toBeCloseTo(1)
  })

  it('clamps out-of-range input', () => {
    expect(toLogPosition(0, 1, 100)).toBe(0)
    expect(toLogPosition(1e9, 1, 100)).toBe(1)
    expect(fromLogPosition(2, 1, 100)).toBe(100)
  })

  it.each([
    [0, 10],
    [5, 5],
    [10, 1],
  ])('rejects invalid ranges [%s, %s]', (min, max) => {
    expect(() => toLogPosition(5, min, max)).toThrow(RangeError)
    expect(() => fromLogPosition(0.5, min, max)).toThrow(RangeError)
  })

  it('round-trips (property)', () => {
    fc.assert(
      fc.property(fc.double({ min: 0.1, max: 10, noNaN: true }), (value) => {
        expect(fromLogPosition(toLogPosition(value, 0.1, 10), 0.1, 10)).toBeCloseTo(value, 9)
      }),
    )
  })
})

describe('roundToSignificant', () => {
  it('keeps three significant digits by default', () => {
    expect(roundToSignificant(1_234_567)).toBe(1_230_000)
    expect(roundToSignificant(987.6)).toBe(988)
  })

  it('produces clean values above 2^53', () => {
    expect(roundToSignificant(1.2345e17)).toBe(1.23e17)
    expect(String(roundToSignificant(1.2345e21))).toBe('1.23e+21')
  })

  it('returns 0 for non-positive or non-finite input', () => {
    expect(roundToSignificant(0)).toBe(0)
    expect(roundToSignificant(-5)).toBe(0)
    expect(roundToSignificant(Number.POSITIVE_INFINITY)).toBe(0)
  })
})

describe('token slider', () => {
  it('spans 1 token to the upper limit', () => {
    expect(sliderValueToTokens(0)).toBe(1)
    expect(sliderValueToTokens(SLIDER_STEPS)).toBe(TOKEN_LIMITS.max)
    expect(tokensToSliderValue(0)).toBe(0)
    expect(tokensToSliderValue(1)).toBe(0)
    expect(tokensToSliderValue(TOKEN_LIMITS.max)).toBe(SLIDER_STEPS)
  })

  it('places a trillion tokens at 12/25 of the track', () => {
    expect(tokensToSliderValue(1e12)).toBe(Math.round((12 / 25) * SLIDER_STEPS))
  })

  describe('properties', () => {
    const step = fc.integer({ min: 0, max: SLIDER_STEPS })

    it('always yields whole, in-range token counts', () => {
      fc.assert(
        fc.property(step, (value) => {
          const tokens = sliderValueToTokens(value)
          expect(Number.isInteger(tokens)).toBe(true)
          expect(tokens).toBeGreaterThanOrEqual(1)
          expect(tokens).toBeLessThanOrEqual(TOKEN_LIMITS.max)
        }),
      )
    })

    it('is monotonic', () => {
      fc.assert(
        fc.property(step, step, (a, b) => {
          const [low, high] = a <= b ? [a, b] : [b, a]
          expect(sliderValueToTokens(low)).toBeLessThanOrEqual(sliderValueToTokens(high))
        }),
      )
    })

    it('round-trips within one step once whole tokens give enough resolution', () => {
      // Below ~100 tokens several steps share one integer (1.06 and 1.12 both round to 1), which is
      // why TokenInput keeps its own thumb position instead of re-deriving it from the token count.
      const resolvedStep = fc.integer({ min: tokensToSliderValue(100), max: SLIDER_STEPS })
      fc.assert(
        fc.property(resolvedStep, (value) => {
          expect(Math.abs(tokensToSliderValue(sliderValueToTokens(value)) - value)).toBeLessThanOrEqual(1)
        }),
      )
    })
  })
})
