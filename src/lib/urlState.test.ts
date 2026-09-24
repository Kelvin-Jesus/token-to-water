import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { TOKEN_LIMITS } from '@/constants/scales'
import { readShareState, writeShareState } from './urlState'

describe('readShareState', () => {
  it('reads tokens and factor', () => {
    expect(readShareState('?t=1500&f=0.3')).toEqual({ tokens: 1500, factor: 0.3 })
  })

  it('accepts scientific notation, including a "+" decoded as a space', () => {
    expect(readShareState('?t=1.5e13')).toEqual({ tokens: 1.5e13 })
    expect(readShareState('?t=2e+21')).toEqual({ tokens: 2e21 })
    expect(readShareState('?t=2e%2B21')).toEqual({ tokens: 2e21 })
  })

  it.each(['?t=-5', '?t=abc', '?t=', '?t=1e30', '?f=0', '?f=50', '?f=abc', '?t=0x10'])('drops invalid values: %s', (search) => {
    expect(readShareState(search)).toEqual({})
  })

  it('rounds fractional token counts', () => {
    expect(readShareState('?t=10.6')).toEqual({ tokens: 11 })
  })
})

describe('writeShareState', () => {
  it('writes a compact, readable query', () => {
    expect(writeShareState('', { tokens: 500, factor: 1 })).toBe('?t=500')
    expect(writeShareState('', { tokens: 2e21, factor: 0.3 })).toBe('?t=2e21&f=0.3')
  })

  it('preserves unrelated parameters', () => {
    expect(writeShareState('?debug=1', { tokens: 10, factor: 1 })).toBe('?debug=1&t=10')
  })

  it('removes the factor when it returns to the default', () => {
    expect(writeShareState('?t=5&f=2', { tokens: 5, factor: 1 })).toBe('?t=5')
  })

  it('round-trips every valid state (property)', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }), fc.double({ min: 1e15, max: TOKEN_LIMITS.max, noNaN: true })),
        fc.double({ min: 0.1, max: 10, noNaN: true }),
        (rawTokens, rawFactor) => {
          const tokens = Math.round(rawTokens)
          const factor = Number(rawFactor.toPrecision(3))
          const restored = readShareState(writeShareState('', { tokens, factor }))
          expect(restored.tokens).toBe(tokens)
          expect(restored.factor ?? 1).toBeCloseTo(factor, 10)
        },
      ),
    )
  })
})
