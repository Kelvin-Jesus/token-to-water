import { describe, expect, it } from 'vitest'
import { TIERS } from '@/constants/scales'
import { computeLayout, framingRect } from './layout'

const layout = computeLayout()

describe('computeLayout', () => {
  it('places every tier once, left to right, without overlapping', () => {
    expect(layout).toHaveLength(TIERS.length)
    for (let i = 1; i < layout.length; i++) {
      const previous = layout[i - 1]!.visual
      expect(layout[i]!.visual.x).toBeGreaterThan(previous.x + previous.w)
    }
  })

  it('stands containers on the ground and digs basins into it', () => {
    for (const item of layout) {
      if (item.shape.placement === 'above') expect(item.box.y + item.box.h).toBeCloseTo(0)
      else expect(item.box.y).toBe(0)
    }
  })

  it('sizes boxes honestly by volume: area = (∛V)²', () => {
    for (const item of layout) {
      const side = Math.cbrt(item.tier.volumeLiters / 1000)
      expect(item.box.w * item.box.h).toBeCloseTo(side * side, 6 - Math.max(0, Math.round(Math.log10(side * side))))
      expect(item.box.w / item.box.h).toBeCloseTo(item.shape.aspect)
    }
  })

  it('draws a drop at roughly real size (a few millimetres)', () => {
    expect(layout[0]!.box.h).toBeGreaterThan(0.002)
    expect(layout[0]!.box.h).toBeLessThan(0.01)
  })

  it('draws all the water on Earth as a globe about 1,100 km across', () => {
    const earth = layout.at(-1)!
    expect(earth.box.w / 1000).toBeGreaterThan(1000)
    expect(earth.box.w / 1000).toBeLessThan(1200)
  })
})

describe('framingRect', () => {
  it('frames the first tier alone', () => {
    expect(framingRect(0, layout)).toEqual(layout[0]!.visual)
  })

  it('frames each later tier together with the one it overflowed from', () => {
    for (let i = 1; i < layout.length; i++) {
      const frame = framingRect(i, layout)
      for (const item of [layout[i]!, layout[i - 1]!]) {
        expect(frame.x).toBeLessThanOrEqual(item.visual.x)
        expect(frame.x + frame.w).toBeGreaterThanOrEqual(item.visual.x + item.visual.w - 1e-6)
      }
    }
  })

  it('throws for an unknown tier', () => {
    expect(() => framingRect(99, layout)).toThrow(RangeError)
  })
})
