import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/render'
import { PresetButtons } from './PresetButtons'

describe('PresetButtons', () => {
  it('offers the four presets with their token counts', () => {
    renderWithProviders(<PresetButtons tokens={0} onSelect={() => {}} />)
    expect(screen.getByRole('group', { name: 'Quick presets' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Short query\s*150 tokens/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Extended chat\s*10K tokens/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Book \/ PDF summary\s*100K tokens/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Frontier model training\s*15T tokens\s*Claude Opus 5 \/ Fable, ChatGPT 6 Astra scale/ })).toBeInTheDocument()
  })

  it('selects a preset', async () => {
    const onSelect = vi.fn()
    renderWithProviders(<PresetButtons tokens={0} onSelect={onSelect} />)
    await userEvent.click(screen.getByRole('button', { name: /Frontier model training/ }))
    expect(onSelect).toHaveBeenCalledWith(15e12)
  })

  it('marks the matching preset as pressed', () => {
    renderWithProviders(<PresetButtons tokens={10_000} onSelect={() => {}} />)
    expect(screen.getByRole('button', { name: /Extended chat/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Short query/ })).toHaveAttribute('aria-pressed', 'false')
  })
})
