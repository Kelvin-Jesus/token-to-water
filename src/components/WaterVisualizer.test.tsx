import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WaterScene } from '@/render/scene'
import { renderWithProviders } from '@/test/render'
import { WaterVisualizer } from './WaterVisualizer'

const baseProps = { quality: 'high', reducedMotion: true, theme: 'light' } as const

describe('WaterVisualizer', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('describes the picture for screen readers', () => {
    renderWithProviders(<WaterVisualizer liters={1_050_000} {...baseProps} />)
    expect(screen.getByRole('img')).toHaveAccessibleName(
      'Olympic pool filled to 42%. Next to it, for scale: a full large pool.',
    )
  })

  it('fills the heads-up display on the first paint', () => {
    renderWithProviders(<WaterVisualizer liters={15} {...baseProps} />)
    expect(screen.getByTestId('hud-tier')).toHaveTextContent('Tier 6 of 20')
    expect(screen.getByTestId('hud-name')).toHaveTextContent('Bucket')
    expect(screen.getByTestId('hud-percent')).toHaveTextContent('100%')
    expect(screen.getByRole('img')).toHaveAttribute('data-tier-id', 'bucket')
  })

  it('updates when the volume changes', () => {
    const { rerender } = renderWithProviders(<WaterVisualizer liters={0.5} {...baseProps} />)
    rerender(<WaterVisualizer liters={0.25} {...baseProps} />)
    expect(screen.getByRole('img')).toHaveAccessibleName('Cup / glass filled to 100%. Next to it, for scale: a full tablespoon.')
  })

  it('localises the HUD', () => {
    renderWithProviders(<WaterVisualizer liters={15} {...baseProps} />, { locale: 'pt-BR' })
    expect(screen.getByTestId('hud-tier')).toHaveTextContent('Nível 6 de 20')
    expect(screen.getByTestId('hud-name')).toHaveTextContent('Balde')
  })

  it('falls back to text when the canvas cannot be drawn', () => {
    // Once: getContext is already a vitest-canvas-mock fn, so a persistent override would leak into later tests.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValueOnce(null)
    renderWithProviders(<WaterVisualizer liters={15} {...baseProps} />)
    expect(screen.getByText(/cannot draw the illustration/)).toBeInTheDocument()
  })

  it('runs its animation loop while mounted and stops it on unmount', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })
    try {
      const frame = vi.spyOn(WaterScene.prototype, 'frame')
      const { unmount } = renderWithProviders(<WaterVisualizer liters={15} {...baseProps} reducedMotion={false} />)
      const afterMount = frame.mock.calls.length
      vi.advanceTimersByTime(200)
      const whileMounted = frame.mock.calls.length
      expect(whileMounted).toBeGreaterThan(afterMount + 5)
      unmount()
      vi.advanceTimersByTime(500)
      expect(frame.mock.calls.length).toBe(whileMounted)
    } finally {
      vi.useRealTimers()
    }
  })

  it('stops rendering once settled with reduced motion (nothing left to animate)', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })
    try {
      const frame = vi.spyOn(WaterScene.prototype, 'frame')
      renderWithProviders(<WaterVisualizer liters={15} {...baseProps} />)
      vi.advanceTimersByTime(100)
      const settledCount = frame.mock.calls.length
      vi.advanceTimersByTime(1000)
      expect(frame.mock.calls.length).toBe(settledCount)
    } finally {
      vi.useRealTimers()
    }
  })

  it('records the active quality for styling and tests', () => {
    renderWithProviders(<WaterVisualizer liters={15} {...baseProps} quality="low" />)
    expect(screen.getByRole('img')).toHaveAttribute('data-quality', 'low')
  })
})

describe('WaterVisualizer pause control (WCAG 2.2.2)', () => {
  it('offers a labelled pause button that reflects the current state', async () => {
    const onToggleMotion = vi.fn()
    const { rerender } = renderWithProviders(
      <WaterVisualizer liters={15} {...baseProps} reducedMotion={false} onToggleMotion={onToggleMotion} />,
    )
    const button = screen.getByRole('button', { name: 'Pause animation' })
    await userEvent.click(button)
    expect(onToggleMotion).toHaveBeenCalledOnce()
    rerender(<WaterVisualizer liters={15} {...baseProps} reducedMotion onToggleMotion={onToggleMotion} />)
    expect(screen.getByRole('button', { name: 'Play animation' })).toBeInTheDocument()
  })

  it('has no pause button when no handler is given', () => {
    renderWithProviders(<WaterVisualizer liters={15} {...baseProps} />)
    expect(screen.queryByRole('button')).toBeNull()
  })
})
