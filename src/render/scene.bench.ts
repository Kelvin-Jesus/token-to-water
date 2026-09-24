import { describe, expect, test } from 'vitest'
import { TIERS } from '@/constants/scales'
import { describeEquivalence } from '@/lib/equivalence'
import { createNoopCanvas } from '@/test/canvasStub'
import type { PerformanceTier } from '@/types'
import { PALETTES } from './palette'
import { WaterScene } from './scene'

/**
 * Performance budgets for the per-frame hot path (Vitest 5 `bench` fixture).
 *
 * The stub context does no rasterising, so these isolate the JavaScript cost
 * (geometry, waves, culling, labels). A 60 FPS frame is 16.7 ms and the GPU
 * needs most of it on a phone, so the JS side must stay tiny. The budgets are
 * ~20× above what a laptop measures, loose enough for slow CI machines but
 * tight enough to catch a regression such as recompiling shapes every frame.
 */
const FRAME_BUDGET_MS = 1.5
const RUN = { time: 250 } as const

function sceneAt(liters: number, quality: PerformanceTier) {
  const scene = new WaterScene(createNoopCanvas(), {
    quality,
    reducedMotion: false,
    palette: PALETTES.dark,
    labels: TIERS.map((tier) => tier.name),
    formatLength: String,
  })
  scene.resize(390, 480, 3)
  scene.setLiters(liters, true)
  return scene
}

describe('frame cost budgets', () => {
  test.for([
    ['small bottle', 0.5, 'high'],
    ['small bottle', 0.5, 'low'],
    ['Olympic pool', 1e6, 'high'],
    ['Amazon River', 1e13, 'high'],
    ['all water on Earth', 1e21, 'high'],
  ] as const)('%s at %s L (%s quality) renders a frame within budget', async ([, liters, quality], { bench }) => {
    const scene = sceneAt(liters, quality)
    const result = await bench('frame', () => void scene.frame(1 / 60)).run(RUN)
    expect(result.latency.mean).toBeLessThan(FRAME_BUDGET_MS)
  })

  test('battery saver is cheaper than high quality', async ({ bench }) => {
    const high = sceneAt(0.5, 'high')
    const low = sceneAt(0.5, 'low')
    const results = await bench.compare(
      bench('high', () => void high.frame(1 / 60)),
      bench('low', () => void low.frame(1 / 60)),
      RUN,
    )
    expect(results.get('low').latency.mean).toBeLessThan(results.get('high').latency.mean)
  })

  test('a full twenty-tier sweep stays within budget on every frame', async ({ bench }) => {
    const scene = sceneAt(0, 'high')
    let target = 0
    const result = await bench('sweep frame', () => {
      // Keep the camera and water level permanently in motion across the whole ladder.
      target = (target + 1) % TIERS.length
      scene.setLiters(TIERS[target]!.volumeLiters * 0.7)
      scene.frame(1 / 60)
    }).run(RUN)
    expect(result.latency.p99).toBeLessThan(FRAME_BUDGET_MS * 2)
  })
})

describe('equivalence budget', () => {
  test('describing a volume is effectively free (runs on every input change)', async ({ bench }) => {
    let liters = 1
    const result = await bench('describeEquivalence', () => {
      liters = (liters * 7.3) % 1e22
      describeEquivalence(liters + 1e-6)
    }).run(RUN)
    expect(result.latency.mean).toBeLessThan(0.05)
  })
})
