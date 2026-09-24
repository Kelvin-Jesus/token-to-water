import { LITERS_PER_TOKEN, TIERS } from '@/constants/scales'
import type { Tier, TierPosition } from '@/types'

/**
 * Relative tolerance for tier boundaries. Without it, 500 tokens × 0.001 L can
 * land a hair above 0.5 L in floating point and skip past the bottle it
 * exactly fills.
 */
const BOUNDARY_EPSILON = 1e-9

export function tokensToLiters(tokens: number, factor = 1): number {
  if (!Number.isFinite(tokens) || tokens < 0) {
    throw new RangeError(`tokens must be a finite, non-negative number (got ${tokens})`)
  }
  if (!Number.isFinite(factor) || factor <= 0) {
    throw new RangeError(`water factor must be a finite, positive number (got ${factor})`)
  }
  return tokens * LITERS_PER_TOKEN * factor
}

/**
 * The container currently being filled: the first tier big enough to hold
 * `liters`, and how full it is. Everything smaller is, by definition, already
 * overflowing, which is what drives the zoom-out between tiers.
 */
export function resolveTier(liters: number, tiers: readonly Tier[] = TIERS): TierPosition {
  if (Number.isNaN(liters)) throw new RangeError('liters must not be NaN')
  if (tiers.length === 0) throw new RangeError('at least one tier is required')
  if (liters <= 0) return { index: 0, fill: 0 }

  for (let index = 0; index < tiers.length; index++) {
    const capacity = tiers[index]!.volumeLiters
    if (capacity * (1 + BOUNDARY_EPSILON) >= liters) {
      return { index, fill: Math.min(1, liters / capacity) }
    }
  }
  const last = tiers.length - 1
  // Past the last rung the fill keeps growing (> 1) so the UI can say "2.3 × all water on Earth".
  return { index: last, fill: liters / tiers[last]!.volumeLiters }
}

/**
 * Whole-token count that fills `tiers[index]` to (just about) 100 %. Rounds
 * down so the result never tips into the next tier; returns `null` when the
 * tier holds less than one token's worth of water (the drop, at default rates).
 */
export function tokensToFillTier(index: number, factor = 1, tiers: readonly Tier[] = TIERS): number | null {
  const tier = tiers[index]
  if (!tier) throw new RangeError(`no tier at index ${index}`)
  const exact = tier.volumeLiters / tokensToLiters(1, factor)
  const nearest = Math.round(exact)
  // A quotient like 88.9999999999 is float noise for 89: snap within resolveTier's relative
  // tolerance (so the result still counts as this tier), otherwise round down.
  const tokens = Math.abs(exact - nearest) <= exact * BOUNDARY_EPSILON ? nearest : Math.floor(exact)
  return tokens >= 1 ? tokens : null
}

/** Index of the largest tier whose volume is ≤ `liters`, or -1 when even the smallest is bigger. */
export function largestTierAtMost(liters: number, tiers: readonly Tier[] = TIERS): number {
  let found = -1
  for (let index = 0; index < tiers.length; index++) {
    if (tiers[index]!.volumeLiters <= liters * (1 + BOUNDARY_EPSILON)) found = index
    else break
  }
  return found
}
