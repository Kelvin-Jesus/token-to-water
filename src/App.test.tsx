import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'

/**
 * Integration tests: the whole app wired together (state, URL, i18n,
 * settings, readouts) in jsdom. The canvas itself is exercised in Chromium by
 * the Playwright suites.
 */

const volume = () => screen.getByTestId('volume').textContent
const equivalence = () => screen.getByTestId('equivalence').textContent

function renderApp(url = '/') {
  window.history.replaceState(null, '', url)
  const user = userEvent.setup()
  render(<App />)
  return user
}

describe('App', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('opens on the headline comparison: 500 tokens = one small bottle', () => {
    renderApp()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Token to Water')
    expect(volume()).toBe('500mL')
    expect(equivalence()).toBe('Equivalent to 1 small bottle')
    expect(screen.getByRole('img')).toHaveAccessibleName(/Small water bottle filled to 100%/)
  })

  it('updates every readout when a preset is chosen', async () => {
    const user = renderApp()
    await user.click(screen.getByRole('button', { name: /Extended chat/ }))
    expect(volume()).toBe('10L')
    expect(equivalence()).toBe('Equivalent to 6 large bottles and 2 small bottles')
    expect(screen.getByTestId('stat-mass')).toHaveTextContent('10 kg')
    expect(screen.getByRole('textbox', { name: 'Tokens' })).toHaveValue('10,000')
  })

  it('reaches frontier-scale training numbers', async () => {
    const user = renderApp()
    await user.click(screen.getByRole('button', { name: /Frontier model training/ }))
    expect(volume()).toBe('15 millionm³')
    expect(equivalence()).toBe('Equivalent to 150 small lakes')
    expect(screen.getByTestId('fill-line')).toHaveTextContent('0.083% of the Amazon’s daily flow')
  })

  it('reacts to typing', async () => {
    const user = renderApp()
    const input = screen.getByRole('textbox', { name: 'Tokens' })
    await user.clear(input)
    await user.type(input, '1.05b{Enter}')
    expect(screen.getByTestId('fill-line')).toHaveTextContent('42% of an Olympic pool')
  })

  it('restores a shared link', () => {
    renderApp('/?t=2500000000')
    expect(volume()).toBe('2,500m³')
    expect(equivalence()).toBe('Equivalent to 1 Olympic pool')
  })

  it('writes the state back into the URL', async () => {
    const user = renderApp()
    await user.click(screen.getByRole('button', { name: /Book \/ PDF summary/ }))
    await waitFor(() => expect(window.location.search).toBe('?t=100000'))
  })

  it('jumps to any tier from the ladder', async () => {
    const user = renderApp()
    await user.click(screen.getByRole('button', { name: /Fill Mediterranean Sea/ }))
    expect(equivalence()).toBe('Exactly the Mediterranean Sea')
    expect(screen.getByRole('button', { current: 'step' })).toHaveAccessibleName(/Mediterranean Sea/)
  })

  it('changes the water rate from Settings', async () => {
    const user = renderApp()
    await user.click(screen.getByRole('button', { name: 'Settings' }))
    const dialog = await screen.findByRole('dialog', { name: 'Settings' })
    fireEvent.keyDown(within(dialog).getByRole('slider', { name: 'Water per token' }), { key: 'End' })
    expect(volume()).toBe('5L')
    expect(screen.getByText('500 tokens × 10 mL per token')).toBeInTheDocument()
    await waitFor(() => expect(window.location.search).toBe('?t=500&f=10'))
  })

  it('switches to Brazilian Portuguese and remembers it', async () => {
    const user = renderApp()
    await user.click(screen.getByRole('radio', { name: 'Português (Brasil)' }))
    expect(document.documentElement.lang).toBe('pt-BR')
    expect(equivalence()).toBe('Equivale a 1 garrafinha')
    expect(screen.getByRole('textbox', { name: 'Tokens' })).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('ttw:prefs:v1')!)).toMatchObject({ locale: 'pt-BR' })
  })

  it('copies a share link and confirms it', async () => {
    const user = renderApp('/?t=150')
    await user.click(screen.getByRole('button', { name: 'Share' }))
    expect(await screen.findByRole('button', { name: 'Link copied' })).toBeInTheDocument()
    await expect(navigator.clipboard.readText()).resolves.toContain('?t=150')
  })

  it('announces one debounced summary to screen readers', () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    renderApp()
    const live = screen.getByTestId('live-summary')
    fireEvent.click(screen.getByRole('button', { name: /Short query/ }))
    fireEvent.click(screen.getByRole('button', { name: /Extended chat/ }))
    act(() => vi.advanceTimersByTime(800))
    expect(live).toHaveTextContent('10,000 tokens: 10 L of water. Equivalent to 6 large bottles and 2 small bottles.')
    expect(live).toHaveAttribute('aria-live', 'polite')
  })

  it('offers a skip link to the controls', () => {
    renderApp()
    expect(screen.getByRole('link', { name: 'Skip to controls' })).toHaveAttribute('href', '#controls')
    expect(document.getElementById('controls')).not.toBeNull()
  })
})

describe('"Building this app" preset', () => {
  it('shows what building this app cost in water', async () => {
    window.history.replaceState(null, '', '/')
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /Building this app/ }))
    expect(screen.getByTestId('volume')).toHaveTextContent(/^1\d\d,\d{3}L$/)
    expect(screen.getByTestId('fill-line')).toHaveTextContent('of an Olympic pool')
  })
})
