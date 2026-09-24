import { describe, expect, it } from 'vitest'
import { hexToRgb, luminance, mixRgb, PALETTES, rgbToCss } from './palette'

/** WCAG contrast ratio between two colours. */
function contrast(a: string, b: string): number {
  const [la, lb] = [luminance(hexToRgb(a)), luminance(hexToRgb(b))]
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

describe('palette helpers', () => {
  it('parses hex colours', () => {
    expect(hexToRgb('#0ea5e9')).toEqual([14, 165, 233])
    expect(hexToRgb('ffffff')).toEqual([255, 255, 255])
    expect(() => hexToRgb('#fff')).toThrow()
  })

  it('mixes and serialises colours', () => {
    expect(mixRgb([0, 0, 0], [255, 255, 255], 0.5)).toEqual([127.5, 127.5, 127.5])
    expect(rgbToCss([10, 20, 30])).toBe('rgb(10, 20, 30)')
    expect(rgbToCss([10, 20, 30], 0.5)).toBe('rgba(10, 20, 30, 0.5)')
  })

  it('computes relative luminance', () => {
    expect(luminance([0, 0, 0])).toBe(0)
    expect(luminance([255, 255, 255])).toBeCloseTo(1)
  })
})

describe('canvas labels stay legible (WCAG AA for text)', () => {
  it.each(['light', 'dark'] as const)('%s theme: labels on the indoor backdrop', (theme) => {
    const palette = PALETTES[theme]
    const [top, bottom] = palette.background.indoor
    const hex = (rgb: readonly number[]) => `#${rgb.map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`
    expect(contrast(palette.label, hex(top))).toBeGreaterThanOrEqual(4.5)
    expect(contrast(palette.label, hex(bottom))).toBeGreaterThanOrEqual(4.5)
  })

  it.each(['light', 'dark'] as const)('%s theme: labels over deep space', (theme) => {
    const palette = PALETTES[theme]
    expect(contrast(palette.labelOnDark, '#020617')).toBeGreaterThanOrEqual(4.5)
  })
})
