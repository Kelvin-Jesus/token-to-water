import { canvas, expect, test, waitForSettled, waterPixelShare } from '../fixtures'

test.describe('first visit', () => {
  test('shows the headline comparison and animates into place', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Token to Water/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Token to Water/)
    await expect(page.getByTestId('volume')).toHaveText('500mL')
    await expect(page.getByTestId('equivalence')).toHaveText('Equivalent to 1 small bottle')
    await waitForSettled(page)
    await expect(page.getByTestId('hud-tier')).toHaveText('Tier 4 of 20')
    await expect(page.getByTestId('hud-percent')).toHaveText('100%')
  })

  test('actually paints water on the canvas, more when fuller', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/?t=0')
    await waitForSettled(page)
    const empty = await waterPixelShare(page)
    await page.goto('/?t=500')
    await waitForSettled(page)
    const full = await waterPixelShare(page)
    expect(empty).toBeLessThan(0.005)
    expect(full).toBeGreaterThan(0.03)
  })
})

test.describe('controls', () => {
  test('typing shorthand updates the picture, the numbers and the URL', async ({ page }) => {
    await page.goto('/')
    const input = page.getByRole('textbox', { name: 'Tokens' })
    await input.fill('1.05b')
    await input.press('Enter')
    await expect(input).toHaveValue('1,050,000,000')
    await expect(page.getByTestId('fill-line')).toHaveText('42% of an Olympic pool')
    await expect(page).toHaveURL(/\?t=1050000000$/)
    await waitForSettled(page)
    await expect(page.getByTestId('hud-name')).toHaveText('Olympic pool')
  })

  test('presets jump between everyday and frontier scale', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Frontier model training/ }).click()
    await expect(page.getByTestId('equivalence')).toHaveText('Equivalent to 150 small lakes')
    await expect(page.getByRole('button', { name: /Frontier model training/ })).toHaveAttribute('aria-pressed', 'true')
    // On phones the presets sit below the stage; the loop pauses while it is off screen, so bring it back.
    await canvas(page).scrollIntoViewIfNeeded()
    await waitForSettled(page)
    await expect(page.getByTestId('hud-tier')).toHaveText('Tier 17 of 20')
  })

  test('the slider works from the keyboard, all the way to the planet', async ({ page }) => {
    test.setTimeout(60_000) // ~17 tiers at ~0.8 s each
    await page.goto('/')
    const slider = page.getByRole('slider', { name: 'Token count, logarithmic scale' })
    await slider.focus()
    await page.keyboard.press('End')
    await expect(page.getByTestId('equivalence')).toHaveText('About 7.22 × all the water on Earth')
    // On phones the slider sits below the stage and the loop pauses while it is off screen.
    await canvas(page).scrollIntoViewIfNeeded()
    await waitForSettled(page)
    await expect(page.getByTestId('hud-tier')).toHaveText('Tier 20 of 20')
    await page.keyboard.press('Home')
    await expect(page.getByRole('textbox', { name: 'Tokens' })).toHaveValue('1')
  })

  test('the ladder fills any container exactly', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /^Fill Large water truck/ }).click()
    await expect(page.getByTestId('equivalence')).toHaveText('Equivalent to 1 large water truck')
    // Picking a rung scrolls the stage back into view so the zoom is actually seen (phones).
    await expect(canvas(page)).toBeInViewport()
    await waitForSettled(page)
    await expect(page.getByTestId('hud-percent')).toHaveText('100%')
    await page.locator('button[aria-current="step"]').scrollIntoViewIfNeeded()
    await expect(page.locator('button[aria-current="step"]')).toBeInViewport({ ratio: 0.9 })
  })
})

test.describe('sharing and persistence', () => {
  test('a shared link restores the exact view', async ({ page }) => {
    await page.goto('/?t=2e21&f=0.5')
    await expect(page.getByTestId('volume')).toHaveText('1 millionkm³')
    await expect(page.getByText('2,000,000,000,000,000,000,000 tokens × 0.5 mL per token')).toBeVisible()
  })

  test('copies the current link', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'clipboard permissions are Chromium-only in Playwright')
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto('/?t=150')
    const hasShareSheet = await page.evaluate(() => typeof navigator.share === 'function' && matchMedia('(pointer: coarse)').matches)
    test.skip(hasShareSheet, 'native share sheet is used instead of the clipboard')
    await page.getByRole('button', { name: 'Share' }).click()
    await expect(page.getByRole('button', { name: 'Link copied' })).toBeVisible()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/\?t=150$/)
  })

  test('remembers language and theme across reloads', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Settings' }).click()
    // Unnamed on purpose: the dialog's own title switches to "Configurações" mid-test.
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('radio', { name: 'Português (Brasil)' }).click()
    await dialog.getByRole('radio', { name: 'Escuro' }).click()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')
    await expect(page.locator('html')).toHaveClass(/dark/)
    await expect(page.getByTestId('equivalence')).toHaveText('Equivale a 1 garrafinha')
  })

  test('applies a saved dark theme before any app code runs (no white flash)', async ({ page, consoleErrors }) => {
    await page.addInitScript(() => localStorage.setItem('ttw:prefs:v1', JSON.stringify({ theme: 'dark' })))
    // Block the app bundle: only the inline <head> script can set the class now.
    await page.route('**/assets/*.js', (route) => route.abort())
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('html')).toHaveClass(/dark/)
    // The blocked bundle is reported as a failed resource — expected here, and only here.
    consoleErrors.splice(0, consoleErrors.length, ...consoleErrors.filter((error) => !error.includes('ERR_FAILED')))
  })
})

test.describe('settings', () => {
  test('opens as a dialog, traps focus and returns it on close', async ({ page }) => {
    await page.goto('/')
    const trigger = page.getByRole('button', { name: 'Settings' })
    await trigger.click()
    const dialog = page.getByRole('dialog', { name: 'Settings' })
    await expect(dialog).toBeVisible()
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press('Tab')
      expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true)
    }
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test('the water rate rescales every number', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Settings' }).click()
    const slider = page.getByRole('slider', { name: 'Water per token' })
    await slider.focus()
    await page.keyboard.press('End')
    await expect(page.getByTestId('factor-value')).toHaveText('10 mL per token')
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('volume')).toHaveText('5L')
    await expect(page).toHaveURL(/f=10/)
  })

  test('battery saver can be forced', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Settings' }).click()
    await page.getByRole('radio', { name: 'Battery saver' }).click()
    await expect(canvas(page)).toHaveAttribute('data-quality', 'low')
    await expect(page.locator('html')).toHaveAttribute('data-perf', 'low')
  })
})

test.describe('motion', () => {
  test('reduced motion skips the zoom and settles immediately', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/?t=1e12') // 10¹² tokens = 10⁹ L: past the small lake, into the Amazon tier
    await waitForSettled(page, 1000)
    await expect(page.getByTestId('hud-tier')).toHaveText('Tier 17 of 20')
  })
})

test.describe('pause control (WCAG 2.2.2)', () => {
  test('stops all motion from the stage itself, and remembers it', async ({ page }) => {
    await page.goto('/?debug')
    await waitForSettled(page)
    await page.getByRole('button', { name: 'Pause animation' }).click()
    await expect(page.getByRole('button', { name: 'Play animation' })).toBeVisible()
    await page.waitForTimeout(300)
    const frames = await page.evaluate(() => (window as unknown as { __TTW_PERF__: { frames: number } }).__TTW_PERF__.frames)
    await page.waitForTimeout(1000)
    expect(await page.evaluate(() => (window as unknown as { __TTW_PERF__: { frames: number } }).__TTW_PERF__.frames)).toBe(frames)
    await page.reload()
    await expect(page.getByRole('button', { name: 'Play animation' })).toBeVisible()
  })
})
