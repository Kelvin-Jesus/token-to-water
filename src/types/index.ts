/**
 * Domain types for Token to Water.
 *
 * Tiers are the rungs of the "Powers of Ten" ladder: fixed reference containers
 * (a drop, a bucket, an Olympic pool, ...) ordered by volume. Everything the UI
 * shows — which container is on screen, how full it is, the equivalency
 * sentence — is derived from a single number: litres of water.
 */

export const TIER_IDS = [
  'drop',
  'tablespoon',
  'cup',
  'small-bottle',
  'bottle',
  'bucket',
  'jug',
  'drum',
  'small-tank',
  'tank',
  'small-truck',
  'large-truck',
  'residential-pool',
  'large-pool',
  'olympic-pool',
  'small-lake',
  'amazon',
  'mediterranean',
  'atlantic',
  'earth',
] as const

export type TierId = (typeof TIER_IDS)[number]

/** Silhouette used by the renderer. Several tiers may share one (e.g. the two water tanks). */
export type ShapeId =
  | 'drop'
  | 'spoon'
  | 'glass'
  | 'bottle-small'
  | 'bottle'
  | 'bucket'
  | 'jug'
  | 'drum'
  | 'tank'
  | 'truck'
  | 'truck-large'
  | 'pool'
  | 'pool-large'
  | 'pool-olympic'
  | 'lake'
  | 'river'
  | 'sea'
  | 'ocean'
  | 'globe'

/** Real-world spread for tiers whose size varies (buckets, trucks, pools). */
export interface VolumeRange {
  readonly min: number
  readonly max: number
}

export interface Tier {
  readonly id: TierId
  /** Canonical English display name. Localised names live in `src/i18n`. */
  readonly name: string
  readonly volumeLiters: number
  readonly range?: VolumeRange
  /** Emoji used in share text, where an icon font cannot be relied on. */
  readonly icon: string
  readonly description: string
  /**
   * Countable containers read naturally as "3 buckets". Unique bodies of water
   * (the Mediterranean, all water on Earth) read as "2.4 × the Mediterranean Sea".
   */
  readonly countable: boolean
  readonly shape: ShapeId
}

/** Where the water currently sits on the ladder. */
export interface TierPosition {
  /** Index into `TIERS` of the container being filled. */
  readonly index: number
  /**
   * Fraction of that container that is full, 0..1. Only the last tier may
   * exceed 1 (more water than exists on Earth).
   */
  readonly fill: number
}

export interface EquivalenceTerm {
  readonly tier: Tier
  readonly count: number
}

/**
 * Human-relatable description of a volume. A discriminated union so each
 * phrasing carries exactly the data it needs.
 */
export type Equivalence =
  | { readonly kind: 'empty' }
  /** Less than the smallest tier: "0.4 of a drop". */
  | { readonly kind: 'fraction'; readonly tier: Tier; readonly fraction: number }
  /** A small whole count, optionally with a second, smaller term: "3 buckets and 1 bottle". */
  | {
      readonly kind: 'count'
      readonly terms: readonly [EquivalenceTerm] | readonly [EquivalenceTerm, EquivalenceTerm]
      readonly approximate: boolean
    }
  /** Ten or more of one tier, shown with decimals: "≈ 12.5 buckets". */
  | { readonly kind: 'multiple'; readonly tier: Tier; readonly count: number; readonly approximate: boolean }

export type PerformanceTier = 'high' | 'low'
export type QualityPreference = 'auto' | PerformanceTier
export type ThemePreference = 'system' | 'light' | 'dark'
export type MotionPreference = 'system' | 'reduce' | 'full'
export type Locale = 'en' | 'pt-BR'

export interface Preset {
  readonly id: 'short-query' | 'extended-chat' | 'book-summary' | 'frontier-training'
  readonly tokens: number
}
