import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/render'
import { Header, type HeaderProps } from './Header'

function renderHeader(overrides: Partial<HeaderProps> = {}) {
  const props: HeaderProps = {
    theme: 'system',
    onThemeChange: vi.fn(),
    locale: 'en',
    onLocaleChange: vi.fn(),
    shareStatus: 'idle',
    onShare: vi.fn(),
    onOpenSettings: vi.fn(),
    ...overrides,
  }
  renderWithProviders(<Header {...props} />)
  return props
}

describe('Header', () => {
  it('cycles the theme system → light → dark', async () => {
    const props = renderHeader()
    await userEvent.click(screen.getByRole('button', { name: 'Theme: System. Switch theme' }))
    expect(props.onThemeChange).toHaveBeenCalledWith('light')
  })

  it('switches language', async () => {
    const props = renderHeader()
    await userEvent.click(screen.getByRole('radio', { name: 'Português (Brasil)' }))
    expect(props.onLocaleChange).toHaveBeenCalledWith('pt-BR')
  })

  it('shares and confirms with an accessible label', async () => {
    const props = renderHeader()
    await userEvent.click(screen.getByRole('button', { name: 'Share' }))
    expect(props.onShare).toHaveBeenCalled()
  })

  it('reflects share feedback in the button label', () => {
    renderHeader({ shareStatus: 'copied' })
    expect(screen.getByRole('button', { name: 'Link copied' })).toBeInTheDocument()
  })

  it('opens settings', async () => {
    const props = renderHeader()
    await userEvent.click(screen.getByRole('button', { name: 'Settings' }))
    expect(props.onOpenSettings).toHaveBeenCalled()
  })
})
