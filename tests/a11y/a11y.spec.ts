import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { expect, test, waitForSettled } from '../fixtures'

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

async function axeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  return results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    targets: violation.nodes.map((node) => node.target.join(' ')).slice(0, 5),
  }))
}

test.describe('WCAG 2.2 AA (axe-core, real layout and colours)', () => {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`main page in ${colorScheme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
      await page.goto('/')
      await waitForSettled(page)
      expect(await axeViolations(page)).toEqual([])
    })
  }

  test('settings dialog', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await page.getByRole('button', { name: 'Settings' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    expect(await axeViolations(page)).toEqual([])
  })

  test('input error state in Portuguese', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('ttw:prefs:v1', JSON.stringify({ locale: 'pt-BR' })))
    await page.goto('/')
    await page.getByRole('textbox', { name: 'Tokens' }).fill('abc')
    await expect(page.getByText('Isso não parece um número. Tente 1500 ou 2,5 mil.')).toBeVisible()
    expect(await axeViolations(page)).toEqual([])
  })
})

test.describe('keyboard', () => {
  test('the skip link jumps straight to the controls', async ({ page }) => {
    await page.goto('/')
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Skip to controls' })
    await expect(skip).toBeFocused()
    await expect(skip).toBeVisible()
    await page.keyboard.press('Enter')
    await page.keyboard.press('Tab')
    await expect(page.getByRole('textbox', { name: 'Tokens' })).toBeFocused()
  })

  test('every control is reachable with Tab and shows a visible focus ring', async ({ page, isMobile }) => {
    test.skip(isMobile, 'hardware keyboard journey')
    await page.goto('/')
    const reached = new Set<string>()
    for (let i = 0; i < 60; i++) {
      await page.keyboard.press('Tab')
      const info = await page.evaluate(() => {
        const element = document.activeElement as HTMLElement | null
        if (!element || element === document.body) return null
        const style = getComputedStyle(element)
        const ring = style.boxShadow !== 'none' || (style.outlineStyle !== 'none' && style.outlineWidth !== '0px')
        const name = element.getAttribute('aria-label') ?? element.textContent.trim().slice(0, 40)
        return { role: element.getAttribute('role') ?? element.tagName.toLowerCase(), name, ring }
      })
      if (!info) continue
      expect(info.ring, `focus ring on ${info.role} "${info.name}"`).toBe(true)
      reached.add(`${info.role}:${info.name}`)
    }
    const all = [...reached].join('\n')
    expect(all).toMatch(/input:/)
    expect(all).toMatch(/slider:/)
    expect(all).toMatch(/Short query/)
    expect(all).toMatch(/button:Settings/)
    expect(all).toMatch(/Fill Water jug/)
  })
})

test.describe('comfort on small screens', () => {
  test('reflows at 320 px without horizontal scrolling (WCAG 1.4.10)', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 })
    await page.goto('/')
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })

  test('survives 200 % text size without clipping the key numbers', async ({ page }) => {
    await page.goto('/')
    await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
    await expect(page.getByTestId('equivalence')).toBeVisible()
  })

  test('touch targets are comfortably large on phones', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'touch layout only')
    await page.goto('/')
    const small = await page.evaluate(() => {
      const offenders: string[] = []
      for (const element of document.querySelectorAll<HTMLElement>('button, a[href], input, [role="slider"]')) {
        const rect = element.getBoundingClientRect()
        // Hidden, or the skip link (visually hidden until keyboard focus, then 40 px tall).
        if (rect.width === 0 || rect.height === 0 || element.classList.contains('sr-only')) continue
        const minimum = element.getAttribute('role') === 'slider' ? 24 : 44 // WCAG 2.5.8 AA / Apple HIG
        if (rect.width < minimum || rect.height < minimum) {
          offenders.push(`${element.tagName} "${element.getAttribute('aria-label') ?? element.textContent.trim()}" ${Math.round(rect.width)}×${Math.round(rect.height)}`)
        }
      }
      return offenders
    })
    expect(small).toEqual([])
  })
})
