import { TIERS } from '@/constants/scales'
import type { Locale, TierId } from '@/types'

/**
 * Localised nouns for each tier. Complete phrases (rather than an article +
 * noun) because Portuguese contracts "de + o" into "do" and agrees articles
 * with gender — assembling them in code would be wrong half the time.
 */
export interface TierLabel {
  /** Title-cased UI label: "Olympic swimming pool". */
  readonly title: string
  /** Count noun, singular: "3 buckets" → "bucket". */
  readonly one: string
  readonly other: string
  /** Indefinite (or, for unique bodies, definite) noun phrase: "an Olympic pool", "the Atlantic Ocean". */
  readonly a: string
  /** Phrase following a fraction: "of an Olympic pool" / "de uma piscina olímpica". */
  readonly of: string
  readonly description: string
}

type TierLabelInput = Omit<TierLabel, 'description'>

const description = (id: TierId): string => TIERS.find((tier) => tier.id === id)!.description

const EN: Record<TierId, TierLabelInput> = {
  drop: { title: 'Water drop', one: 'drop', other: 'drops', a: 'a drop', of: 'of a drop' },
  tablespoon: { title: 'Sip / tablespoon', one: 'tablespoon', other: 'tablespoons', a: 'a tablespoon', of: 'of a tablespoon' },
  cup: { title: 'Cup / glass', one: 'glass of water', other: 'glasses of water', a: 'a glass of water', of: 'of a glass of water' },
  'small-bottle': {
    title: 'Small water bottle',
    one: 'small bottle',
    other: 'small bottles',
    a: 'a small water bottle',
    of: 'of a small water bottle',
  },
  bottle: { title: 'Standard bottle', one: 'large bottle', other: 'large bottles', a: 'a 1.5 L bottle', of: 'of a 1.5 L bottle' },
  bucket: { title: 'Bucket', one: 'bucket', other: 'buckets', a: 'a bucket', of: 'of a bucket' },
  jug: { title: 'Water jug', one: 'water jug', other: 'water jugs', a: 'a water jug', of: 'of a water jug' },
  drum: { title: 'Drum / barrel', one: 'drum', other: 'drums', a: 'a drum', of: 'of a drum' },
  'small-tank': {
    title: 'Small water tank',
    one: 'small water tank',
    other: 'small water tanks',
    a: 'a small water tank',
    of: 'of a small water tank',
  },
  tank: { title: 'Water tank', one: 'water tank', other: 'water tanks', a: 'a water tank', of: 'of a water tank' },
  'small-truck': {
    title: 'Small water truck',
    one: 'small water truck',
    other: 'small water trucks',
    a: 'a small water truck',
    of: 'of a small water truck',
  },
  'large-truck': {
    title: 'Large water truck',
    one: 'large water truck',
    other: 'large water trucks',
    a: 'a large water truck',
    of: 'of a large water truck',
  },
  'residential-pool': {
    title: 'Residential pool',
    one: 'backyard pool',
    other: 'backyard pools',
    a: 'a backyard pool',
    of: 'of a backyard pool',
  },
  'large-pool': { title: 'Large pool', one: 'large pool', other: 'large pools', a: 'a large pool', of: 'of a large pool' },
  'olympic-pool': {
    title: 'Olympic pool',
    one: 'Olympic pool',
    other: 'Olympic pools',
    a: 'an Olympic pool',
    of: 'of an Olympic pool',
  },
  'small-lake': { title: 'Small lake', one: 'small lake', other: 'small lakes', a: 'a small lake', of: 'of a small lake' },
  amazon: {
    title: 'Amazon River, one day',
    one: 'day of Amazon flow',
    other: 'days of Amazon flow',
    a: 'the Amazon’s daily flow',
    of: 'of the Amazon’s daily flow',
  },
  mediterranean: {
    title: 'Mediterranean Sea',
    one: 'Mediterranean Sea',
    other: 'Mediterranean Seas',
    a: 'the Mediterranean Sea',
    of: 'of the Mediterranean Sea',
  },
  atlantic: {
    title: 'Atlantic Ocean',
    one: 'Atlantic Ocean',
    other: 'Atlantic Oceans',
    a: 'the Atlantic Ocean',
    of: 'of the Atlantic Ocean',
  },
  earth: {
    title: 'All water on Earth',
    one: 'Earth’s worth of water',
    other: 'Earths’ worth of water',
    a: 'all the water on Earth',
    of: 'of all the water on Earth',
  },
}

const PT_BR: Record<TierId, TierLabel> = {
  drop: {
    title: 'Gota d’água',
    one: 'gota',
    other: 'gotas',
    a: 'uma gota',
    of: 'de uma gota',
    description: 'Cerca de 0,05 mL. Um token na taxa padrão equivale a umas 20 gotas.',
  },
  tablespoon: {
    title: 'Gole / colher de sopa',
    one: 'colher de sopa',
    other: 'colheres de sopa',
    a: 'uma colher de sopa',
    of: 'de uma colher de sopa',
    description: 'Uma colher de sopa de 15 mL — mais ou menos um gole.',
  },
  cup: { title: 'Copo', one: 'copo', other: 'copos', a: 'um copo', of: 'de um copo', description: 'Um copo padrão de 250 mL.' },
  'small-bottle': {
    title: 'Garrafinha',
    one: 'garrafinha',
    other: 'garrafinhas',
    a: 'uma garrafinha',
    of: 'de uma garrafinha',
    description: 'A clássica garrafinha de 500 mL — um prompt de 500 tokens na taxa padrão.',
  },
  bottle: {
    title: 'Garrafa',
    one: 'garrafa',
    other: 'garrafas',
    a: 'uma garrafa de 1,5 L',
    of: 'de uma garrafa de 1,5 L',
    description: 'Uma garrafa família de 1,5 L.',
  },
  bucket: {
    title: 'Balde',
    one: 'balde',
    other: 'baldes',
    a: 'um balde',
    of: 'de um balde',
    description: 'Baldes domésticos comportam de 10 a 20 L.',
  },
  jug: {
    title: 'Galão',
    one: 'galão',
    other: 'galões',
    a: 'um galão',
    of: 'de um galão',
    description: 'O galão de 20 L do bebedouro do escritório.',
  },
  drum: {
    title: 'Tambor',
    one: 'tambor',
    other: 'tambores',
    a: 'um tambor',
    of: 'de um tambor',
    description: 'Um tambor industrial de 200 L.',
  },
  'small-tank': {
    title: 'Caixa d’água pequena',
    one: 'caixa d’água pequena',
    other: 'caixas d’água pequenas',
    a: 'uma caixa d’água pequena',
    of: 'de uma caixa d’água pequena',
    description: 'Uma caixa d’água de 500 L, comum nas casas brasileiras.',
  },
  tank: {
    title: 'Caixa d’água',
    one: 'caixa d’água',
    other: 'caixas d’água',
    a: 'uma caixa d’água',
    of: 'de uma caixa d’água',
    description: '1.000 L — exatamente um metro cúbico.',
  },
  'small-truck': {
    title: 'Caminhão-pipa pequeno',
    one: 'caminhão-pipa pequeno',
    other: 'caminhões-pipa pequenos',
    a: 'um caminhão-pipa pequeno',
    of: 'de um caminhão-pipa pequeno',
    description: 'Um caminhão-pipa de 5.000 L.',
  },
  'large-truck': {
    title: 'Caminhão-pipa grande',
    one: 'caminhão-pipa grande',
    other: 'caminhões-pipa grandes',
    a: 'um caminhão-pipa grande',
    of: 'de um caminhão-pipa grande',
    description: 'Caminhões-pipa grandes levam de 10.000 a 20.000 L.',
  },
  'residential-pool': {
    title: 'Piscina residencial',
    one: 'piscina residencial',
    other: 'piscinas residenciais',
    a: 'uma piscina residencial',
    of: 'de uma piscina residencial',
    description: 'Piscinas residenciais têm de 20.000 a 50.000 L.',
  },
  'large-pool': {
    title: 'Piscina grande',
    one: 'piscina grande',
    other: 'piscinas grandes',
    a: 'uma piscina grande',
    of: 'de uma piscina grande',
    description: 'Uma piscina de clube ou hotel com 100.000 L.',
  },
  'olympic-pool': {
    title: 'Piscina olímpica',
    one: 'piscina olímpica',
    other: 'piscinas olímpicas',
    a: 'uma piscina olímpica',
    of: 'de uma piscina olímpica',
    description: '50 × 25 × 2 m — 2.500 m³ de água.',
  },
  'small-lake': {
    title: 'Lago pequeno',
    one: 'lago pequeno',
    other: 'lagos pequenos',
    a: 'um lago pequeno',
    of: 'de um lago pequeno',
    description: '100.000 m³ — um pequeno lago ou reservatório.',
  },
  amazon: {
    title: 'Rio Amazonas, um dia',
    one: 'dia de vazão do Amazonas',
    other: 'dias de vazão do Amazonas',
    a: 'a vazão diária do Rio Amazonas',
    of: 'da vazão diária do Rio Amazonas',
    description: 'O Amazonas despeja cerca de 18 km³ no Atlântico por dia (≈ 209.000 m³/s).',
  },
  mediterranean: {
    title: 'Mar Mediterrâneo',
    one: 'Mar Mediterrâneo',
    other: 'Mares Mediterrâneos',
    a: 'o Mar Mediterrâneo',
    of: 'do Mar Mediterrâneo',
    description: 'Cerca de 3,75 milhões de km³ de água salgada.',
  },
  atlantic: {
    title: 'Oceano Atlântico',
    one: 'Oceano Atlântico',
    other: 'Oceanos Atlânticos',
    a: 'o Oceano Atlântico',
    of: 'do Oceano Atlântico',
    description: 'Cerca de 310 milhões de km³ — mais de um quinto de toda a água da Terra.',
  },
  earth: {
    title: 'Toda a água da Terra',
    one: 'Terra de água',
    other: 'Terras de água',
    a: 'toda a água da Terra',
    of: 'de toda a água da Terra',
    description: 'Cerca de 1,386 bilhão de km³: oceanos, gelo, águas subterrâneas, lagos, rios e vapor (USGS).',
  },
}

const withDescriptions = (labels: Record<TierId, TierLabelInput>): Record<TierId, TierLabel> =>
  Object.fromEntries(
    Object.entries(labels).map(([id, label]) => [id, { ...label, description: description(id as TierId) }]),
  ) as Record<TierId, TierLabel>

export const TIER_LABELS: Readonly<Record<Locale, Readonly<Record<TierId, TierLabel>>>> = {
  en: withDescriptions(EN),
  'pt-BR': PT_BR,
}

export function tierLabel(id: TierId, locale: Locale): TierLabel {
  return TIER_LABELS[locale][id]
}
