import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/test/render'
import { StatsGrid } from './StatsGrid'

describe('StatsGrid', () => {
  it('shows weight and days of drinking water', () => {
    renderWithProviders(<StatsGrid liters={15} />)
    expect(screen.getByTestId('stat-mass')).toHaveTextContent('15 kg')
    expect(screen.getByTestId('stat-drinking')).toHaveTextContent('7.5 days')
  })

  it('switches to a sentence past the age of the universe', () => {
    renderWithProviders(<StatsGrid liters={1e25} />)
    expect(screen.getByTestId('stat-drinking')).toHaveTextContent('Longer than the age of the universe')
  })
})
