import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/render'
import type { Locale } from '@/types'
import { TokenInput } from './TokenInput'

function Harness({ initial = 500, onChange }: { initial?: number; onChange?: (tokens: number) => void }) {
  const [tokens, setTokens] = useState(initial)
  return (
    <>
      <TokenInput
        tokens={tokens}
        onTokensChange={(value) => {
          setTokens(value)
          onChange?.(value)
        }}
      />
      <output data-testid="tokens">{tokens}</output>
    </>
  )
}

function setup(initial?: number, locale: Locale = 'en') {
  const onChange = vi.fn()
  const user = userEvent.setup()
  renderWithProviders(<Harness initial={initial} onChange={onChange} />, { locale })
  return { user, onChange, input: screen.getByRole('textbox', { name: 'Tokens' }) }
}

describe('TokenInput', () => {
  it('shows the current value with locale grouping', () => {
    setup(1_000_000)
    expect(screen.getByRole('textbox', { name: 'Tokens' })).toHaveValue('1,000,000')
  })

  it('uses Brazilian grouping in pt-BR', () => {
    setup(1_000_000, 'pt-BR')
    expect(screen.getByRole('textbox', { name: 'Tokens' })).toHaveValue('1.000.000')
  })

  it('groups digits live while typing and updates the value immediately', async () => {
    const { user, input, onChange } = setup()
    await user.clear(input)
    await user.type(input, '1234567')
    expect(input).toHaveValue('1,234,567')
    expect(onChange).toHaveBeenLastCalledWith(1_234_567)
  })

  it('accepts shorthand and normalises it on Enter', async () => {
    const { user, input } = setup()
    await user.clear(input)
    await user.type(input, '15T{Enter}')
    expect(screen.getByTestId('tokens')).toHaveTextContent('15000000000000')
    expect(input).toHaveValue('15,000,000,000,000')
    expect(screen.getByText('Reads as 15 trillion tokens')).toBeInTheDocument()
  })

  it('flags invalid text without changing the value, and Escape restores it', async () => {
    const { user, input, onChange } = setup(500)
    await user.clear(input)
    await user.type(input, 'abc')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('That doesn’t look like a number. Try 1500 or 2.5k.')).toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalledWith(Number.NaN)

    await user.tab()
    expect(input).toHaveValue('abc') // kept so it can be fixed, not silently thrown away

    await user.click(input)
    await user.keyboard('{Escape}')
    expect(input).toHaveValue('500')
    expect(input).toHaveAttribute('aria-invalid', 'false')
  })

  it('rejects negative numbers with a specific message', async () => {
    const { user, input } = setup()
    await user.clear(input)
    await user.type(input, '-5')
    expect(screen.getByText('Tokens can’t be negative. Enter 0 or more.')).toBeInTheDocument()
  })

  it('restores the value when the field is left empty', async () => {
    const { user, input } = setup(750)
    await user.clear(input)
    expect(input).toHaveAttribute('aria-invalid', 'false')
    await user.tab()
    expect(input).toHaveValue('750')
  })

  it('links the reading and the shorthand examples for screen readers', () => {
    const { input } = setup()
    expect(input).toHaveAccessibleDescription('Reads as 500 tokens e.g. 2.5k, 1.2M, 15T')
  })

  it('reads a single token in the singular', () => {
    setup(1)
    expect(screen.getByText('Reads as 1 token')).toBeInTheDocument()
  })

  it('exposes a labelled logarithmic slider with a readable value', () => {
    setup(1_500_000)
    const slider = screen.getByRole('slider', { name: 'Token count, logarithmic scale' })
    expect(slider).toHaveAttribute('aria-valuetext', '1.5 million tokens')
  })

  it('moves the slider from the far left with the keyboard (regression: thumb pinned near 1 token)', () => {
    setup(1)
    const slider = screen.getByRole('slider')
    expect(slider).toHaveAttribute('aria-valuenow', '0')
    for (let i = 0; i < 3; i++) fireEvent.keyDown(slider, { key: 'ArrowRight' })
    expect(slider).toHaveAttribute('aria-valuenow', '3')
    for (let i = 0; i < 40; i++) fireEvent.keyDown(slider, { key: 'ArrowRight' })
    expect(Number(screen.getByTestId('tokens').textContent)).toBeGreaterThan(1)
  })

  it('jumps by decades with PageUp and reaches the ends with Home / End', () => {
    setup(1000)
    const slider = screen.getByRole('slider')
    fireEvent.keyDown(slider, { key: 'End' })
    expect(screen.getByTestId('tokens')).toHaveTextContent('1e+25')
    fireEvent.keyDown(slider, { key: 'Home' })
    expect(screen.getByTestId('tokens')).toHaveTextContent(/^1$/)
  })

  it('follows external changes (presets, ladder) with the thumb', () => {
    const { rerender } = renderWithProviders(<TokenInput tokens={1} onTokensChange={() => {}} />)
    rerender(<TokenInput tokens={1e12} onTokensChange={() => {}} />)
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', String((12 / 25) * 1000))
  })
})
