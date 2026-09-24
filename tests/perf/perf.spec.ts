import type { Page } from '@playwright/test'
import { canvas, expect, test, waitForSettled } from '../fixtures'

/**
 * Runtime performance against the production build. `?debug` exposes frame
 * counters on window.__TTW_PERF__ (and nothing else changes).
 */
test.describe.configure({ mode: 'serial' })

interface PerfStats {
  frames: number
  totalCost: number
  maxCost: number
}

/** Record a measured value in the report (HTML annotations + stdout) so regressions are visible, not just pass/fail. */
function metric(name: string, value: number, unit: string): void {
  const description = `${value.toFixed(2)} ${unit}`
  test.info().annotations.push({ type: name, description })
  console.log(`[metric] ${name}: ${description}`)
}

const stats = (page: Page) => page.evaluate(() => ({ ...(window as unknown as { __TTW_PERF__: PerfStats }).__TTW_PERF__ }))

/** Average FPS of requestAnimationFrame over `ms`, measured inside the page. */
function measureFps(page: Page, ms: number): Promise<number> {
  return page.evaluate(
    (duration) =>
      new Promise<number>((resolve) => {
        let frames = 0
        const start = performance.now()
        const tick = (now: number) => {
          frames++
          if (now - start < duration) requestAnimationFrame(tick)
          else resolve((frames * 1000) / (now - start))
        }
        requestAnimationFrame(tick)
      }),
    ms,
  )
}

test('holds ~60 FPS during the full Powers-of-Ten sweep, with cheap frames', async ({ page }) => {
  await page.goto('/?debug&t=1e24')
  const fps = await measureFps(page, 3000)
  const { frames, totalCost, maxCost } = await stats(page)
  metric('sweep fps', fps, 'FPS')
  metric('sweep mean frame cost', totalCost / frames, 'ms')
  metric('sweep worst frame cost', maxCost, 'ms')
  expect(fps).toBeGreaterThanOrEqual(50)
  expect(totalCost / frames).toBeLessThan(4) // ms of main-thread work per frame, on average
  expect(maxCost).toBeLessThan(50)
})

test('stays usable under 4× CPU throttling (mid-range phone)', async ({ page }) => {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  await page.goto('/?debug&t=1e24')
  const fps = await measureFps(page, 3000)
  const { frames, totalCost } = await stats(page)
  metric('4× throttled fps', fps, 'FPS')
  metric('4× throttled mean frame cost', totalCost / frames, 'ms')
  expect(fps).toBeGreaterThanOrEqual(30)
  expect(totalCost / frames).toBeLessThan(12)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
})

test('falls back to battery saver automatically when frames are slow', async ({ page }) => {
  // `stress` burns 30 ms per frame: ~25 FPS, well under the 45 FPS threshold.
  await page.goto('/?debug&stress=30')
  await expect(canvas(page)).toHaveAttribute('data-quality', 'high')
  await expect(canvas(page)).toHaveAttribute('data-quality', 'low', { timeout: 10_000 })
  await expect(page.locator('html')).toHaveAttribute('data-perf', 'low')
})

test('does not fall back on a fast device', async ({ page }) => {
  await page.goto('/?debug')
  await page.waitForTimeout(5000)
  await expect(canvas(page)).toHaveAttribute('data-quality', 'high')
})

test('stops rendering while the canvas is scrolled out of view', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 })
  await page.goto('/?debug')
  await waitForSettled(page)
  await page.getByRole('heading', { name: 'How the numbers work' }).scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  const hidden = (await stats(page)).frames
  await page.waitForTimeout(1000)
  expect((await stats(page)).frames - hidden).toBeLessThanOrEqual(1)

  await canvas(page).scrollIntoViewIfNeeded()
  await page.waitForTimeout(500)
  expect((await stats(page)).frames).toBeGreaterThan(hidden + 10)
})

test('halves the frame rate once idle, to save battery', async ({ page }) => {
  await page.goto('/?debug')
  await waitForSettled(page)
  await page.waitForTimeout(6500) // idle threshold is 6 s after settling
  const before = (await stats(page)).frames
  await page.waitForTimeout(2000)
  const perSecond = ((await stats(page)).frames - before) / 2
  metric('idle frame rate', perSecond, 'FPS')
  expect(perSecond).toBeGreaterThan(20)
  expect(perSecond).toBeLessThan(40)
})

test('with reduced motion, renders nothing once settled', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/?debug&t=1e9')
  await waitForSettled(page)
  await page.waitForTimeout(200)
  const before = (await stats(page)).frames
  await page.waitForTimeout(1500)
  expect((await stats(page)).frames).toBe(before)
})

test('good Core Web Vitals on load (LCP, CLS)', async ({ page }) => {
  await page.goto('/')
  await waitForSettled(page)
  const vitals = await page.evaluate(
    () =>
      new Promise<{ lcp: number; cls: number }>((resolve) => {
        let lcp = 0
        let cls = 0
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) lcp = Math.max(lcp, entry.startTime)
        }).observe({ type: 'largest-contentful-paint', buffered: true })
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
            if (!entry.hadRecentInput) cls += entry.value
          }
        }).observe({ type: 'layout-shift', buffered: true })
        setTimeout(() => resolve({ lcp, cls }), 500)
      }),
  )
  metric('LCP', vitals.lcp, 'ms')
  metric('CLS', vitals.cls, '')
  expect(vitals.lcp).toBeGreaterThan(0)
  expect(vitals.lcp).toBeLessThan(2500)
  expect(vitals.cls).toBeLessThan(0.1)
})

test('does not leak memory while sweeping back and forth', async ({ page }) => {
  const cdp = await page.context().newCDPSession(page)
  await page.goto('/?debug')
  await waitForSettled(page)
  const heap = async () => {
    await cdp.send('HeapProfiler.collectGarbage')
    return (await cdp.send('Runtime.getHeapUsage')).usedSize
  }
  const input = page.getByRole('textbox', { name: 'Tokens' })
  const sweep = async () => {
    for (const value of ['1e24', '1', '1e12', '500', '1e20', '10']) {
      await input.fill(value)
      await page.waitForTimeout(250)
    }
  }
  await sweep() // warm up JIT and caches
  const baseline = await heap()
  for (let i = 0; i < 4; i++) await sweep()
  const growth = (await heap()) - baseline
  metric('heap growth after 4 sweeps', growth / 1024, 'KB')
  expect(growth).toBeLessThan(2 * 1024 * 1024)
})
