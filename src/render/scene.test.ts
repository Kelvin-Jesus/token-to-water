import { describe, expect, it } from 'vitest'
import { TIERS } from '@/constants/scales'
import { fitRect } from '@/lib/camera'
import { resolveTier } from '@/lib/conversion'
import { createCanvasStub } from '@/test/canvasStub'
import type { PerformanceTier } from '@/types'
import { framingRect } from './layout'
import { PALETTES } from './palette'
import { WaterScene } from './scene'

const LABELS = TIERS.map((tier) => tier.name)
const EARTH = TIERS.at(-1)!.volumeLiters

function createScene(options: { quality?: PerformanceTier; reducedMotion?: boolean } = {}) {
  const stub = createCanvasStub()
  const scene = new WaterScene(stub.ctx, {
    quality: options.quality ?? 'high',
    reducedMotion: options.reducedMotion ?? false,
    palette: PALETTES.light,
    labels: LABELS,
    formatLength: (meters) => `${meters} m`,
  })
  scene.resize(400, 300, 1)
  return { scene, ...stub }
}

/** Run frames at 60 Hz until settled (or the time budget runs out). */
function runUntilSettled(scene: WaterScene, maxSeconds = 20) {
  let info = scene.frame(0)
  for (let t = 0; t < maxSeconds && !info.settled; t += 1 / 60) info = scene.frame(1 / 60)
  return info
}

describe('WaterScene', () => {
  it('starts empty, as a single drop', () => {
    const { scene } = createScene()
    expect(scene.frame(0)).toMatchObject({ index: 0, settled: true })
    expect(scene.displayedLiters).toBe(0)
  })

  it('animates up to the target and settles on the exact value', () => {
    const { scene } = createScene()
    scene.setLiters(0.5)
    const first = scene.frame(1 / 60)
    expect(first.settled).toBe(false)
    expect(first.animating).toBe(true)
    const info = runUntilSettled(scene)
    expect(info).toMatchObject({ index: 3, fill: 1, settled: true })
    expect(scene.displayedLiters).toBe(0.5)
  })

  it('visits every tier in order on the way up (the Powers-of-Ten sweep)', () => {
    const { scene } = createScene()
    scene.setLiters(EARTH * 0.5)
    const visited: number[] = []
    let info = scene.frame(0)
    for (let t = 0; t < 30 && !info.settled; t += 1 / 60) {
      info = scene.frame(1 / 60)
      if (visited.at(-1) !== info.index) visited.push(info.index)
    }
    expect(visited).toEqual(TIERS.map((_, index) => index))
  })

  it('takes a few seconds, not an instant, to sweep twenty tiers', () => {
    const { scene } = createScene()
    scene.setLiters(EARTH * 0.5)
    let frames = 0
    let info = scene.frame(0)
    while (!info.settled && frames < 60 * 30) {
      info = scene.frame(1 / 60)
      frames++
    }
    expect(frames / 60).toBeGreaterThan(4)
    expect(frames / 60).toBeLessThan(12)
  })

  it('ends with the camera framing the active tier and its predecessor', () => {
    const { scene } = createScene()
    scene.setLiters(2_000_000)
    const info = runUntilSettled(scene)
    const expected = fitRect(framingRect(info.index, scene.layout), scene.viewport, 0.1, 0.68)
    expect(scene.currentCamera!.scale).toBeCloseTo(expected.scale, 6)
    expect(scene.currentCamera!.x).toBeCloseTo(expected.x, 6)
  })

  it('jumps straight to the target with reduced motion', () => {
    const { scene } = createScene({ reducedMotion: true })
    scene.setLiters(1_050_000)
    const info = scene.frame(1 / 60)
    expect(info).toMatchObject({ index: resolveTier(1_050_000).index, settled: true, animating: false })
  })

  it('snaps when reduced motion is switched on mid-animation', () => {
    const { scene } = createScene()
    scene.setLiters(1e9)
    scene.frame(1 / 60)
    scene.update({ reducedMotion: true })
    expect(scene.frame(1 / 60).settled).toBe(true)
  })

  it('keeps animating waves (but reports settled) without reduced motion', () => {
    const { scene } = createScene()
    scene.setLiters(0.5, true)
    const info = runUntilSettled(scene)
    expect(info.settled).toBe(true)
    expect(info.animating).toBe(true)
  })

  it('can set a value immediately (first paint)', () => {
    const { scene } = createScene()
    scene.setLiters(15, true)
    expect(scene.frame(0)).toMatchObject({ index: 5, fill: 1 })
  })

  it('reports fills above 1 past the last tier', () => {
    const { scene } = createScene({ reducedMotion: true })
    scene.setLiters(EARTH * 3)
    expect(scene.frame(0).fill).toBeCloseTo(3)
  })

  it('rejects NaN', () => {
    expect(() => createScene().scene.setLiters(Number.NaN)).toThrow(RangeError)
  })

  it('never passes NaN or Infinity to the canvas at any tier', () => {
    for (const quality of ['high', 'low'] as const) {
      const { scene, calls } = createScene({ quality })
      for (const tier of TIERS) {
        for (const fraction of [0.3, 1]) {
          scene.setLiters(tier.volumeLiters * fraction)
          for (let i = 0; i < 20; i++) scene.frame(1 / 60)
        }
      }
      const bad = calls.filter((call) => call.args.some((arg) => typeof arg === 'number' && !Number.isFinite(arg)))
      expect(bad.slice(0, 3)).toEqual([])
    }
  })

  it('labels the container that just overflowed', () => {
    const { scene, calls } = createScene({ reducedMotion: true })
    scene.setLiters(10)
    scene.frame(0)
    const texts = calls.filter((call) => call.method === 'fillText').map((call) => call.args[0])
    expect(texts).toContain(LABELS[4])
  })

  it('draws a map-style scale bar with a round length', () => {
    const { scene, calls } = createScene({ reducedMotion: true })
    scene.setLiters(0.5)
    scene.frame(0)
    const label = calls.filter((call) => call.method === 'fillText').map((call) => String(call.args[0])).find((text) => text.endsWith(' m'))
    expect(label).toBeDefined()
    const meters = Number(label!.replace(' m', ''))
    const mantissa = meters / 10 ** Math.floor(Math.log10(meters))
    expect([1, 2, 5]).toContain(Math.round(mantissa))
  })

  it('skips expensive effects in battery-saver mode', () => {
    const drawEarth = (quality: PerformanceTier) => {
      const stub = createScene({ quality, reducedMotion: true })
      stub.scene.setLiters(EARTH * 0.5)
      stub.scene.frame(0)
      return stub
    }
    const high = drawEarth('high')
    const low = drawEarth('low')
    // The globe's atmospheric glow is a radial gradient; stars are tiny fillRects.
    expect(high.count('createRadialGradient')).toBeGreaterThan(0)
    expect(low.count('createRadialGradient')).toBe(0)
    expect(low.count('fillRect')).toBeLessThan(high.count('fillRect'))
  })

  it('splashes when a container overflows, only in high quality', () => {
    const run = (quality: PerformanceTier) => {
      const stub = createScene({ quality })
      stub.scene.setLiters(0.49, true)
      stub.scene.frame(0)
      stub.scene.setLiters(0.6)
      let arcs = 0
      for (let i = 0; i < 30; i++) {
        const before = stub.count('arc')
        stub.scene.frame(1 / 60)
        arcs = Math.max(arcs, stub.count('arc') - before)
      }
      return arcs
    }
    expect(run('high')).toBeGreaterThan(run('low') + 10)
  })

  it('re-fits the camera on resize (no animated re-framing)', () => {
    const { scene } = createScene()
    scene.setLiters(15, true)
    scene.frame(0)
    scene.resize(800, 600, 2)
    scene.frame(1 / 60)
    const expected = fitRect(framingRect(5, scene.layout), scene.viewport, 0.1, 0.68)
    expect(scene.currentCamera!.scale).toBeCloseTo(expected.scale, 6)
    expect(scene.currentCamera!.y).toBeCloseTo(expected.y, 6)
  })

  it('clamps huge time steps so a stalled tab does not teleport the animation', () => {
    const { scene } = createScene()
    scene.setLiters(EARTH)
    scene.frame(0)
    expect(scene.frame(10).index).toBeLessThan(3)
  })
})
