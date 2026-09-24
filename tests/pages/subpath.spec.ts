import { expect, test, waitForSettled } from '../fixtures'

/**
 * Deployment smoke test: the production build served under /token-to-water/,
 * the way GitHub Pages hosts a project site. The server 404s everything
 * outside that path, so any root-relative asset URL fails loudly here.
 */
const BASE = 'http://localhost:4180/token-to-water/'

test('loads, animates and stays fully functional under the Pages sub-path', async ({ page }) => {
  const failed: string[] = []
  page.on('response', (response) => {
    if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`)
  })
  await page.goto(BASE)
  await expect(page.getByTestId('equivalence')).toHaveText('Equivalent to 1 small bottle')
  await waitForSettled(page)

  // The lazily loaded settings chunk must resolve relative to the page, not the domain root.
  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible()
  await page.keyboard.press('Escape')

  // Favicon and manifest are referenced from index.html and must resolve too.
  for (const selector of ['link[rel="icon"]', 'link[rel="manifest"]']) {
    const href = await page.locator(selector).evaluate((link: HTMLLinkElement) => link.href)
    expect(href.startsWith(BASE), `${selector} → ${href}`).toBe(true)
    expect((await page.request.get(href)).ok()).toBe(true)
  }
  expect(failed).toEqual([])
})

test('shared links keep the sub-path and restore state', async ({ page }) => {
  await page.goto(BASE)
  await page.getByRole('button', { name: /Book \/ PDF summary/ }).click()
  await expect(page).toHaveURL(`${BASE}?t=100000`)
  await page.reload()
  await expect(page.getByTestId('volume')).toHaveText('100L')
})
