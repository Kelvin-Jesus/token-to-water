import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { crossSectionWidth, getShape, polygonArea, roundedRect, SHAPE_IDS, smoothPath, tub } from './shapes'

describe('geometry helpers', () => {
  it('measures cross-sections of a square', () => {
    const square = [
      [0, 0],
      [2, 0],
      [2, 2],
      [0, 2],
    ] as const
    expect(crossSectionWidth(square, 1)).toBe(2)
    expect(crossSectionWidth(square, 3)).toBe(0)
    expect(polygonArea(square)).toBe(4)
  })

  it('builds an open-top tub from rim to rim', () => {
    const points = tub(0, 1, 0, 0.1, 0.9, 1, 0.05)
    expect(points[0]).toEqual([0, 0])
    expect(points.at(-1)).toEqual([1, 0])
  })

  it('builds rounded rectangles with the expected area', () => {
    expect(polygonArea(roundedRect(0, 0, 2, 1, 0.2, 16))).toBeCloseTo(2 - (4 - Math.PI) * 0.04, 2)
  })

  it('keeps smoothed basins below ground', () => {
    const path = smoothPath([
      [0, 0],
      [1, 0.9],
      [2, 0],
    ])
    for (const [, y] of path) expect(y).toBeGreaterThanOrEqual(0)
    expect(path[0]).toEqual([0, 0])
    expect(path.at(-1)).toEqual([2, 0])
  })
})

describe.each(SHAPE_IDS)('shape "%s"', (id) => {
  const shape = getShape(id)

  it('is cached', () => {
    expect(getShape(id)).toBe(shape)
  })

  it('has a non-empty interior inside its bounds', () => {
    expect(polygonArea(shape.interior)).toBeGreaterThan(0.01)
    expect(shape.left).toBeGreaterThanOrEqual(shape.bounds.x0 - 1e-9)
    expect(shape.right).toBeLessThanOrEqual(shape.bounds.x1 + 1e-9)
    expect(shape.top).toBeGreaterThanOrEqual(shape.bounds.y0 - 1e-9)
    expect(shape.bottom).toBeLessThanOrEqual(1 + 1e-9)
    expect(shape.right - shape.left).toBeLessThanOrEqual(shape.aspect + 1e-9)
  })

  it('maps 0 % to the bottom and 100 % to the top', () => {
    expect(shape.levelForFill(0)).toBe(shape.bottom)
    expect(shape.levelForFill(1)).toBe(shape.top)
    expect(shape.levelForFill(-1)).toBe(shape.bottom)
    expect(shape.levelForFill(2)).toBe(shape.top)
  })

  it('fills by area, not by height (property)', () => {
    fc.assert(
      fc.property(fc.double({ min: 0.01, max: 0.99, noNaN: true }), (fill) => {
        const level = shape.levelForFill(fill)
        expect(level).toBeLessThanOrEqual(shape.bottom)
        expect(level).toBeGreaterThanOrEqual(shape.top)
        expect(shape.fillForLevel(level)).toBeCloseTo(fill, 3)
      }),
    )
  })

  it('rises monotonically as it fills (property)', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 1, noNaN: true }), fc.double({ min: 0, max: 1, noNaN: true }), (a, b) => {
        const [low, high] = a <= b ? [a, b] : [b, a]
        // y points down: more water → smaller y.
        expect(shape.levelForFill(high)).toBeLessThanOrEqual(shape.levelForFill(low) + 1e-12)
      }),
    )
  })
})

describe('area-accurate filling', () => {
  it('half-fills a bottle well below its narrow neck', () => {
    // The wide body holds nearly all the water, so 50 % sits around the middle of the body.
    const bottle = getShape('bottle-small')
    const halfLevel = bottle.levelForFill(0.5)
    expect(halfLevel).toBeLessThan((bottle.top + bottle.bottom) / 2 + 0.1)
    expect(halfLevel).toBeGreaterThan(bottle.top + 0.2)
  })

  it('needs more than half the depth to half-fill a bowl-shaped lake', () => {
    // The basin narrows towards the bottom, so the lower half of its depth holds less than half its water.
    const lake = getShape('lake')
    const depthAtHalf = (lake.bottom - lake.levelForFill(0.5)) / (lake.bottom - lake.top)
    expect(depthAtHalf).toBeGreaterThan(0.5)
  })
})
