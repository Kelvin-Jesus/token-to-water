import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/render'
import { SettingsDialog, type SettingsDialogProps } from './SettingsDialog'

function renderDialog(overrides: Partial<SettingsDialogProps> = {}) {
  const props: SettingsDialogProps = {
    open: true,
    onOpenChange: vi.fn(),
    factor: 1,
    onFactorChange: vi.fn(),
    quality: 'auto',
    onQualityChange: vi.fn(),
    activeTier: 'high',
    tierReason: 'default',
    motion: 'system',
    reducedMotion: false,
    onMotionChange: vi.fn(),
    theme: 'system',
    onThemeChange: vi.fn(),
    locale: 'en',
    onLocaleChange: vi.fn(),
    ...overrides,
  }
  renderWithProviders(<SettingsDialog {...props} />)
  return props
}

describe('SettingsDialog', () => {
  it('is a labelled modal dialog', () => {
    renderDialog()
    const dialog = screen.getByRole('dialog', { name: 'Settings' })
    expect(dialog).toHaveAccessibleDescription('Tune the estimate and how the visualizer looks and moves.')
  })

  it('adjusts water per token on a log slider', () => {
    const props = renderDialog()
    const slider = screen.getByRole('slider', { name: 'Water per token' })
    expect(slider).toHaveAttribute('aria-valuetext', '1 mL per token')
    fireEvent.keyDown(slider, { key: 'End' })
    expect(props.onFactorChange).toHaveBeenLastCalledWith(10)
    fireEvent.keyDown(slider, { key: 'Home' })
    expect(props.onFactorChange).toHaveBeenLastCalledWith(0.1)
  })

  it('offers a reset only when the rate was changed', () => {
    expect(renderDialog().factor).toBe(1)
    expect(screen.getByRole('button', { name: /Reset to 1 mL/ })).toBeDisabled()
  })

  it('resets the rate', async () => {
    const props = renderDialog({ factor: 3 })
    await userEvent.click(screen.getByRole('button', { name: /Reset to 1 mL/ }))
    expect(props.onFactorChange).toHaveBeenCalledWith(1)
  })

  it('switches rendering quality and explains an automatic downgrade', async () => {
    const props = renderDialog({ activeTier: 'low', tierReason: 'fps' })
    expect(screen.getByTestId('quality-status')).toHaveTextContent('Switched automatically to keep the animation smooth.')
    await userEvent.click(screen.getByRole('radio', { name: 'High' }))
    expect(props.onQualityChange).toHaveBeenCalledWith('high')
  })

  it('toggles reduced motion', async () => {
    const props = renderDialog()
    await userEvent.click(screen.getByRole('switch', { name: 'Reduce motion' }))
    expect(props.onMotionChange).toHaveBeenCalledWith('reduce')
  })

  it('changes theme and language', async () => {
    const props = renderDialog()
    await userEvent.click(screen.getByRole('radio', { name: 'Dark' }))
    expect(props.onThemeChange).toHaveBeenCalledWith('dark')
    await userEvent.click(screen.getByRole('radio', { name: 'Português (Brasil)' }))
    expect(props.onLocaleChange).toHaveBeenCalledWith('pt-BR')
  })

  it('closes with Escape and with the close button', async () => {
    const props = renderDialog()
    await userEvent.keyboard('{Escape}')
    expect(props.onOpenChange).toHaveBeenCalledWith(false)
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(props.onOpenChange).toHaveBeenCalledTimes(2)
  })
})
