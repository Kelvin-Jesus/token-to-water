import { describe, expect, it } from 'vitest'
import { TIER_IDS } from '@/types'
import { detectLocale, en, interpolate, isLocale, LOCALES, MESSAGES } from './messages'
import { TIER_LABELS } from './tierLabels'

const placeholders = (text: string) => [...text.matchAll(/\{(\w[\w-]*)\}/g)].map((match) => match[1]).sort()

describe('messages', () => {
  it('translates every key into every locale', () => {
    for (const locale of LOCALES) {
      expect(Object.keys(MESSAGES[locale]).sort()).toEqual(Object.keys(en).sort())
      for (const value of Object.values(MESSAGES[locale])) expect(value.trim()).not.toBe('')
    }
  })

  it('keeps the same {placeholders} in every translation', () => {
    for (const locale of LOCALES) {
      for (const [key, template] of Object.entries(en)) {
        expect(placeholders(MESSAGES[locale][key as keyof typeof en]), `${locale}: ${key}`).toEqual(placeholders(template))
      }
    }
  })

  it('labels every tier in every locale', () => {
    for (const locale of LOCALES) {
      expect(Object.keys(TIER_LABELS[locale]).sort()).toEqual([...TIER_IDS].sort())
      for (const label of Object.values(TIER_LABELS[locale])) {
        for (const text of Object.values(label)) expect(text.trim()).not.toBe('')
      }
    }
  })

  it('uses Portuguese contractions for unique bodies of water', () => {
    expect(TIER_LABELS['pt-BR'].mediterranean.of).toBe('do Mar Mediterrâneo')
    expect(TIER_LABELS['pt-BR'].amazon.of).toBe('da vazão diária do Rio Amazonas')
  })

  it('uses "an" before vowel sounds in English', () => {
    expect(TIER_LABELS.en['olympic-pool'].a).toBe('an Olympic pool')
  })
})

describe('interpolate', () => {
  it('fills placeholders', () => {
    expect(interpolate('{a} and {b}', { a: 1, b: 'two' })).toBe('1 and two')
  })

  it('leaves unknown placeholders visible instead of printing "undefined"', () => {
    expect(interpolate('{missing} value')).toBe('{missing} value')
  })
})

describe('detectLocale', () => {
  it.each([
    [['pt-BR', 'en'], 'pt-BR'],
    [['pt-PT'], 'pt-BR'],
    [['en-GB', 'pt-BR'], 'en'],
    [['fr-FR', 'pt'], 'pt-BR'],
    [['de'], 'en'],
    [[], 'en'],
  ])('%j → %s', (languages, expected) => {
    expect(detectLocale(languages)).toBe(expected)
  })
})

describe('isLocale', () => {
  it('accepts only supported locales', () => {
    expect(isLocale('en')).toBe(true)
    expect(isLocale('pt-BR')).toBe(true)
    expect(isLocale('pt')).toBe(false)
    expect(isLocale(null)).toBe(false)
  })
})
