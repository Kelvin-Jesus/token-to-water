import { test as base, expect, type Page } from '@playwright/test'

/**
 * Shared fixtures: every test fails on uncaught page errors or console errors,
 * so a broken code path can't hide behind a passing assertion.
 */
export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(`console.error: ${message.text()}`)
      })
      await use(errors)
      expect(errors, 'no console errors or uncaught exceptions').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }

export const canvas = (page: Page) => page.getByTestId('water-canvas')

/** Wait until the water level and camera have reached their targets (each tier takes ~0.8 s). */
export async function waitForSettled(page: Page, timeout = 30_000): Promise<void> {
  await expect(canvas(page)).toHaveAttribute('data-settled', 'true', { timeout })
}

/** Share of canvas pixels that look like water (clearly blue), read straight from the backing store. */
export async function waterPixelShare(page: Page): Promise<number> {
  return canvas(page).evaluate((element: HTMLCanvasElement) => {
    const context = element.getContext('2d')
    if (!context) return 0
    const { data } = context.getImageData(0, 0, element.width, element.height)
    let water = 0
    let total = 0
    for (let i = 0; i < data.length; i += 16) {
      const [r, g, b] = [data[i]!, data[i + 1]!, data[i + 2]!]
      total++
      if (b > 150 && b > r + 60 && g > 60) water++
    }
    return water / total
  })
}
