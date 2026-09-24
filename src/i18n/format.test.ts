import { describe, expect, it } from 'vitest'
import { TIERS } from '@/constants/scales'
import { describeEquivalence } from '@/lib/equivalence'
import type { Equivalence, TierId } from '@/types'
import { countNoun, formatEquivalence, translate } from './format'

const tier = (id: TierId) => TIERS.find((candidate) => candidate.id === id)!
const sentence = (liters: number, locale: 'en' | 'pt-BR' = 'en') => formatEquivalence(describeEquivalence(liters), locale).sentence

describe('formatEquivalence', () => {
  it('reads naturally in English', () => {
    expect(sentence(0)).toBe('No water yet. Enter a number of tokens.')
    expect(sentence(0.5)).toBe('Equivalent to 1 small bottle')
    expect(sentence(16.5)).toBe('Equivalent to 1 bucket and 1 large bottle')
    expect(sentence(46.5)).toBe('About 2 water jugs and 4 large bottles')
    expect(sentence(1_050_000)).toBe('About 10.5 large pools')
    expect(sentence(0.00002)).toBe('Equivalent to 0.4 of a drop')
  })

  it('reads naturally in Brazilian Portuguese', () => {
    expect(sentence(0.5, 'pt-BR')).toBe('Equivale a 1 garrafinha')
    expect(sentence(46.5, 'pt-BR')).toBe('Cerca de 2 galões e 4 garrafas')
    expect(sentence(1_050_000, 'pt-BR')).toBe('Cerca de 10,5 piscinas grandes')
  })

  it('describes unique bodies of water with ×', () => {
    expect(sentence(tier('mediterranean').volumeLiters)).toBe('Exactly the Mediterranean Sea')
    expect(sentence(tier('earth').volumeLiters * 2.5)).toBe('About 2.5 × all the water on Earth')
    expect(sentence(tier('mediterranean').volumeLiters * 3, 'pt-BR')).toBe('Equivale a 3 × o Mar Mediterrâneo')
  })

  it('returns a bare phrase for embedding in other sentences', () => {
    expect(formatEquivalence(describeEquivalence(16.5), 'en').phrase).toBe('1 bucket and 1 large bottle')
  })

  it('fails loudly on an unknown kind', () => {
    expect(() => formatEquivalence({ kind: 'bogus' } as unknown as Equivalence, 'en')).toThrow(/unhandled equivalence/)
  })
})

describe('countNoun', () => {
  it('picks singular and plural forms with CLDR rules', () => {
    expect(countNoun(tier('bucket'), 1, 'en')).toBe('1 bucket')
    expect(countNoun(tier('bucket'), 3, 'en')).toBe('3 buckets')
    expect(countNoun(tier('bucket'), 1.5, 'en')).toBe('1.5 buckets')
    // Portuguese treats 0 ≤ n < 2 as singular: "1,5 balde".
    expect(countNoun(tier('bucket'), 1.5, 'pt-BR')).toBe('1,5 balde')
    expect(countNoun(tier('bucket'), 2, 'pt-BR')).toBe('2 baldes')
  })
})

describe('translate', () => {
  it('interpolates into the chosen locale', () => {
    expect(translate('pt-BR', 'viz.tier', { index: 3, count: 20 })).toBe('Nível 3 de 20')
  })
})
