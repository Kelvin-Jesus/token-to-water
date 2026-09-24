import type { Equivalence, EquivalenceTerm, Locale, Tier } from '@/types'
import { formatFraction, formatInteger, formatNumber } from '@/utils/formatters'
import { interpolate, MESSAGES, type MessageKey } from './messages'
import { tierLabel } from './tierLabels'

const pluralRulesCache = new Map<Locale, Intl.PluralRules>()

function pluralCategory(count: number, locale: Locale): Intl.LDMLPluralRule {
  let rules = pluralRulesCache.get(locale)
  if (!rules) {
    rules = new Intl.PluralRules(locale)
    pluralRulesCache.set(locale, rules)
  }
  return rules.select(count)
}

export function translate(locale: Locale, key: MessageKey, values?: Readonly<Record<string, string | number>>): string {
  return interpolate(MESSAGES[locale][key], values)
}

/** "3 buckets", "1 glass of water", "12.5 Olympic pools" — CLDR plural rules pick the noun form. */
export function countNoun(tier: Tier, count: number, locale: Locale): string {
  const label = tierLabel(tier.id, locale)
  const formatted = Number.isInteger(count) ? formatInteger(count, locale) : formatNumber(count, locale)
  return `${formatted} ${pluralCategory(count, locale) === 'one' ? label.one : label.other}`
}

function termText(term: EquivalenceTerm, locale: Locale): string {
  return countNoun(term.tier, term.count, locale)
}

export interface EquivalenceText {
  /** Just the comparison: "3 buckets and 1 large bottle". Used inside other sentences. */
  readonly phrase: string
  /** Stand-alone sentence with the right lead-in: "Equivalent to …" / "About …". */
  readonly sentence: string
}

export function formatEquivalence(equivalence: Equivalence, locale: Locale): EquivalenceText {
  const wrap = (phrase: string, approximate: boolean): EquivalenceText => ({
    phrase,
    sentence: translate(locale, approximate ? 'equivalence.approx' : 'equivalence.exact', { text: phrase }),
  })

  switch (equivalence.kind) {
    case 'empty': {
      const sentence = translate(locale, 'equivalence.empty')
      return { phrase: sentence, sentence }
    }
    case 'fraction': {
      const phrase = translate(locale, 'equivalence.fraction', {
        value: formatFraction(equivalence.fraction, locale),
        of: tierLabel(equivalence.tier.id, locale).of,
      })
      return wrap(phrase, false)
    }
    case 'count': {
      const [first, second] = equivalence.terms
      const phrase = second
        ? translate(locale, 'equivalence.pair', { first: termText(first, locale), second: termText(second, locale) })
        : termText(first, locale)
      return wrap(phrase, equivalence.approximate)
    }
    case 'multiple': {
      const { tier, count, approximate } = equivalence
      if (tier.countable) return wrap(countNoun(tier, count, locale), approximate)
      const name = tierLabel(tier.id, locale).a
      if (!approximate && count === 1) {
        const sentence = translate(locale, 'equivalence.exactUnique', { name })
        return { phrase: name, sentence }
      }
      return wrap(translate(locale, 'equivalence.times', { count: formatNumber(count, locale), name }), approximate)
    }
    default: {
      const unreachable: never = equivalence
      throw new Error(`unhandled equivalence: ${JSON.stringify(unreachable)}`)
    }
  }
}
