import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { type Camera, camerasMatch, fitRect, type Rect, stepCamera, unionRect, type Viewport, worldToScreen } from './camera'

const viewport: Viewport = { width: 400, height: 300, insets: { top: 50, right: 10, bottom: 30, left: 10 } }

describe('unionRect', () => {
  it('bounds both rectangles', () => {
    expect(unionRect({ x: 0, y: 0, w: 1, h: 1 }, { x: 2, y: -1, w: 1, h: 1 })).toEqual({ x: 0, y: -1, w: 3, h: 2 })
  })
})

describe('fitRect', () => {
  it('fits the rect inside the safe area with padding', () => {
    const rect: Rect = { x: -1, y: -2, w: 2, h: 2 }
    const camera = fitRect(rect, viewport, 0.1)
    const topLeft = worldToScreen(camera, rect.x, rect.y)
    const bottomRight = worldToScreen(camera, rect.x + rect.w, rect.y + rect.h)
    expect(topLeft.y).toBeGreaterThanOrEqual(50 - 1e-9)
    expect(bottomRight.y).toBeLessThanOrEqual(270 + 1e-9)
    expect(topLeft.x).toBeGreaterThanOrEqual(10)
    expect(bottomRight.x).toBeLessThanOrEqual(390)
    // Height-limited: 220 px of safe height for 2 × 1.2 world units.
    expect(camera.scale).toBeCloseTo(220 / 2.4)
  })

  it('distributes spare height according to alignY', () => {
    const wide: Rect = { x: 0, y: 0, w: 10, h: 1 }
    const top = worldToScreen(fitRect(wide, viewport, 0, 0), 0, 0).y
    const bottom = worldToScreen(fitRect(wide, viewport, 0, 1), 0, 1).y
    expect(top).toBeCloseTo(50)
    expect(bottom).toBeCloseTo(270)
  })

  it('stays finite for degenerate rectangles', () => {
    const camera = fitRect({ x: 0, y: 0, w: 0, h: 0 }, viewport)
    expect(Number.isFinite(camera.x)).toBe(true)
  })
})

describe('stepCamera', () => {
  const from: Camera = { scale: 100, x: 200, y: 150 }
  const to: Camera = { scale: 1, x: 20, y: 250 }

  it('returns the endpoints at alpha 0 and 1', () => {
    expect(stepCamera(from, to, 0)).toBe(from)
    expect(stepCamera(from, to, 1)).toBe(to)
  })

  it('interpolates scale geometrically (each decade takes equal time)', () => {
    expect(stepCamera(from, to, 0.5).scale).toBeCloseTo(10)
  })

  it('keeps the shared fixed point pinned on screen throughout the zoom', () => {
    // Fixed point: the world point both cameras map to the same pixel.
    const fixedX = (to.x - from.x) / (from.scale - to.scale)
    const fixedY = (to.y - from.y) / (from.scale - to.scale)
    const pinned = worldToScreen(from, fixedX, fixedY)
    for (const alpha of [0.1, 0.35, 0.8]) {
      const screen = worldToScreen(stepCamera(from, to, alpha), fixedX, fixedY)
      expect(screen.x).toBeCloseTo(pinned.x, 6)
      expect(screen.y).toBeCloseTo(pinned.y, 6)
    }
  })

  it('pans linearly when the scale does not change', () => {
    expect(stepCamera({ scale: 2, x: 0, y: 0 }, { scale: 2, x: 10, y: -10 }, 0.5)).toEqual({ scale: 2, x: 5, y: -5 })
  })

  it('converges when applied repeatedly (property)', () => {
    const camera = fc.record({
      scale: fc.double({ min: 1e-6, max: 1e6, noNaN: true }),
      x: fc.double({ min: -1e6, max: 1e6, noNaN: true }),
      y: fc.double({ min: -1e6, max: 1e6, noNaN: true }),
    })
    fc.assert(
      fc.property(camera, camera, (start, target) => {
        let current: Camera = start
        for (let i = 0; i < 400; i++) current = stepCamera(current, target, 0.2)
        expect(Math.abs(Math.log(current.scale / target.scale))).toBeLessThan(1e-3)
        expect(Math.abs(current.x - target.x)).toBeLessThan(1e-3 * Math.max(1, Math.abs(target.x)))
      }),
    )
  })
})

describe('camerasMatch', () => {
  it('tolerates sub-pixel differences only', () => {
    expect(camerasMatch({ scale: 1, x: 0, y: 0 }, { scale: 1.0001, x: 0.1, y: -0.1 })).toBe(true)
    expect(camerasMatch({ scale: 1, x: 0, y: 0 }, { scale: 1, x: 2, y: 0 })).toBe(false)
    expect(camerasMatch({ scale: 1, x: 0, y: 0 }, { scale: 1.1, x: 0, y: 0 })).toBe(false)
  })
})
