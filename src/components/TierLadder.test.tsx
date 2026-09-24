import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/render'
import { TierLadder } from './TierLadder'

describe('TierLadder', () => {
  const renderLadder = (onJump = vi.fn(), index = 5, fill = 0.5) =>
    renderWithProviders(<TierLadder position={{ index, fill }} factor={1} reducedMotion onJump={onJump} />)

  it('lists all twenty containers in order', () => {
    renderLadder()
    const items = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(items).toHaveLength(20)
    expect(items[0]).toHaveTextContent('Water drop')
    expect(items[19]).toHaveTextContent('All water on Earth')
  })

  it('marks the active container as the current step and earlier ones as overflowing', () => {
    renderLadder()
    const active = screen.getByRole('button', { current: 'step' })
    // Value and unit are joined by a no-break space so they never wrap apart.
    expect(active).toHaveAccessibleName('Fill Bucket (15\u00a0L), filling')
    expect(screen.getByRole('button', { name: /Standard bottle.*overflowing/ })).toBeInTheDocument()
  })

  it('fills a container exactly when picked', async () => {
    const onJump = vi.fn()
    renderLadder(onJump)
    await userEvent.click(screen.getByRole('button', { name: /Olympic pool/ }))
    expect(onJump).toHaveBeenCalledWith(2_500_000_000)
  })

  it('disables tiers smaller than one token, explaining why', () => {
    renderLadder()
    expect(screen.getByRole('button', { name: 'Water drop (0.05\u00a0mL) holds less than one token of water' })).toBeDisabled()
  })
})
