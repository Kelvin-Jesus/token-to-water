import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { describe, expect, it } from 'vitest'
import { App } from './App'

/**
 * Automated WCAG checks with axe-core in jsdom. jsdom has no layout engine,
 * so colour contrast is checked in Chromium by tests/a11y instead; everything
 * structural (names, roles, ARIA validity, labels, landmarks) is checked here.
 */
async function violations(root: Element = document.body) {
  const results = await axe.run(root, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] },
    rules: { 'color-contrast': { enabled: false } },
  })
  return results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    nodes: violation.nodes.map((node) => node.target.join(' ')),
  }))
}

// axe walks the whole app tree; allow for slow CI machines.
describe('accessibility (axe-core)', { timeout: 20_000 }, () => {
  it('has no violations on the main page', async () => {
    render(<App />)
    expect(await violations()).toEqual([])
  })

  it('has no violations with the settings dialog open', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Settings' }))
    await screen.findByRole('dialog', { name: 'Settings' })
    expect(await violations()).toEqual([])
  })

  it('has no violations in Portuguese with an invalid input', async () => {
    localStorage.setItem('ttw:prefs:v1', JSON.stringify({ locale: 'pt-BR' }))
    render(<App />)
    const input = screen.getByRole('textbox', { name: 'Tokens' })
    await userEvent.clear(input)
    await userEvent.type(input, 'xyz')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(await violations()).toEqual([])
  })
})
