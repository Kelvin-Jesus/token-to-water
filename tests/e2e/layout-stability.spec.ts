import type { Page } from '@playwright/test'
import { expect, test } from '../fixtures'

/**
 * Regression: while dragging the slider, changing text lengths used to
 * (1) overflow the page sideways for long volumes ("3,75 milhões km³"),
 *     flashing a horizontal scrollbar, and
 * (2) re-wrap the comparison sentence between 1 and 2 lines, resizing the
 *     readout card and pushing the slider away from the pointer.
 * Sweep the whole slider range and require a perfectly still layout.
 */
async function measure(page: Page) {
  return page.evaluate(() => {
    const slider = document.querySelector('[role="slider"]')!.getBoundingClientRect()
    const readout = document.querySelector('[data-testid="volume"]')!.closest('[data-slot="card"]')!.getBoundingClientRect()
    return {
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      sliderTop: Math.round(slider.top + window.scrollY),
      readoutHeight: Math.round(readout.height),
    }
  })
}

for (const locale of ['en', 'pt-BR'] as const) {
  test(`dragging the slider never shifts the layout or overflows (${locale})`, async ({ page }) => {
    test.setTimeout(90_000)
    await page.addInitScript((value) => localStorage.setItem('ttw:prefs:v1', JSON.stringify({ locale: value, motion: 'reduce' })), locale)
    await page.goto('/?t=1')
    const slider = page.getByRole('slider').first()
    await slider.focus()
    const baseline = await measure(page)
    const seen = new Set<string>()
    // PageUp moves 10 of 1000 steps: 100 stops cover 1 → 10²⁵ tokens, every unit and wording.
    for (let step = 0; step < 100; step++) {
      await page.keyboard.press('PageUp')
      const now = await measure(page)
      const volume = (await page.getByTestId('volume').textContent()) ?? ''
      seen.add(volume)
      expect(now.overflowX, `horizontal overflow at ${volume}`).toBeLessThanOrEqual(0)
      expect(now.sliderTop, `slider moved at ${volume}`).toBe(baseline.sliderTop)
      expect(now.readoutHeight, `readout resized at ${volume}`).toBe(baseline.readoutHeight)
    }
    expect(seen.size).toBeGreaterThan(50)
  })
}
