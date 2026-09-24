import type { Page } from '@playwright/test'
import { expect, test, waitForSettled } from '../fixtures'

/**
 * Screenshot regression. The page clock is installed before load, so
 * requestAnimationFrame, performance.now and the wave phase are all driven by
 * `runFor` — every run renders the identical frame.
 */
async function open(page: Page, query: string, options: { colorScheme?: 'light' | 'dark'; locale?: string } = {}) {
  await page.emulateMedia({ colorScheme: options.colorScheme ?? 'light' })
  if (options.locale) {
    await page.addInitScript((locale) => localStorage.setItem('ttw:prefs:v1', JSON.stringify({ locale })), options.locale)
  }
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') })
  await page.goto(`/${query}`)
  await page.evaluate(() => document.fonts.ready)
  await page.clock.runFor(10_000)
  await waitForSettled(page)
}

test.describe('visual regression', () => {
  test('default view (light)', async ({ page }) => {
    await open(page, '')
    await expect(page).toHaveScreenshot('default-light.png')
  })

  test('Olympic pool (dark)', async ({ page }) => {
    await open(page, '?t=1050000000', { colorScheme: 'dark' })
    await expect(page).toHaveScreenshot('olympic-dark.png')
  })

  test('all water on Earth', async ({ page }) => {
    await open(page, '?t=700000000000000000000000')
    await expect(page.getByTestId('water-canvas')).toHaveScreenshot('earth-canvas.png')
  })

  test('Portuguese, frontier training', async ({ page }) => {
    await open(page, '?t=15000000000000', { locale: 'pt-BR' })
    await expect(page).toHaveScreenshot('frontier-pt-br.png')
  })

  test('phone layout with settings sheet', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await open(page, '?t=15000')
    await page.getByRole('button', { name: 'Settings' }).click()
    await page.clock.runFor(1000)
    await expect(page).toHaveScreenshot('mobile-settings.png')
  })

  test('full page, every section', async ({ page }) => {
    await open(page, '?t=35000000')
    await expect(page).toHaveScreenshot('full-page.png', { fullPage: true })
  })
})
