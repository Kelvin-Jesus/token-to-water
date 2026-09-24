import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TIERS } from '@/constants/scales'
import { resolveTier } from '@/lib/conversion'
import { describeEquivalence } from '@/lib/equivalence'
import { renderWithProviders } from '@/test/render'
import type { Locale } from '@/types'
import { EquivalenceReadout } from './EquivalenceReadout'

function renderReadout(liters: number, locale: Locale = 'en') {
  return renderWithProviders(
    <EquivalenceReadout
      liters={liters}
      tokens={liters * 1000}
      mlPerToken={1}
      position={resolveTier(liters)}
      equivalence={describeEquivalence(liters)}
    />,
    { locale },
  )
}

describe('EquivalenceReadout', () => {
  it('shows the volume, the comparison and the current container', () => {
    renderReadout(1_050_000)
    expect(screen.getByRole('heading', { name: 'Water footprint' })).toBeInTheDocument()
    expect(screen.getByTestId('volume')).toHaveTextContent('1,050m³')
    expect(screen.getByTestId('equivalence')).toHaveTextContent('About 10.5 large pools')
    expect(screen.getByTestId('fill-line')).toHaveTextContent('42% of an Olympic pool')
    expect(screen.getByText('1,050,000,000 tokens × 1 mL per token')).toBeInTheDocument()
  })

  it('announces when there is more water than on Earth', () => {
    renderReadout(TIERS.at(-1)!.volumeLiters * 2)
    expect(screen.getByText('More water than exists on Earth')).toBeInTheDocument()
  })

  it('localises everything', () => {
    renderReadout(0.5, 'pt-BR')
    expect(screen.getByRole('heading', { name: 'Pegada hídrica' })).toBeInTheDocument()
    expect(screen.getByTestId('equivalence')).toHaveTextContent('Equivale a 1 garrafinha')
    expect(screen.getByTestId('fill-line')).toHaveTextContent('100% de uma garrafinha')
  })
})
