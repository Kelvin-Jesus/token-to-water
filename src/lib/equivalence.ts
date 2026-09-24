import { TIERS } from '@/constants/scales'
import type { Equivalence, EquivalenceTerm, Tier } from '@/types'
import { largestTierAtMost } from './conversion'

/** From this many units up, "12.5 buckets" reads better than "12 buckets and 2 bottles". */
const WHOLE_COUNT_LIMIT = 10
/** A remainder worth less than this share of the total is noise, not information. */
const NEGLIGIBLE_SHARE = 0.01
const EXACT_TOLERANCE = 1e-9

function isApproximately(value: number, target: number): boolean {
  return Math.abs(value - target) <= EXACT_TOLERANCE * Math.max(1, Math.abs(target))
}

/**
 * Describe a volume in everyday containers, e.g. "3 buckets and 1 bottle".
 *
 * Greedy on purpose: the biggest container that fits is the most relatable
 * anchor, and one optional smaller term adds precision without turning the
 * sentence into an inventory.
 */
export function describeEquivalence(liters: number, tiers: readonly Tier[] = TIERS): Equivalence {
  if (Number.isNaN(liters)) throw new RangeError('liters must not be NaN')
  if (liters <= 0) return { kind: 'empty' }

  const primaryIndex = largestTierAtMost(liters, tiers)
  if (primaryIndex < 0) {
    return { kind: 'fraction', tier: tiers[0]!, fraction: liters / tiers[0]!.volumeLiters }
  }

  const primary = tiers[primaryIndex]!
  const ratio = liters / primary.volumeLiters
  if (ratio >= WHOLE_COUNT_LIMIT || !primary.countable) {
    return { kind: 'multiple', tier: primary, count: ratio, approximate: !isApproximately(ratio, Math.round(ratio)) }
  }

  const wholeCount = Math.floor(ratio + EXACT_TOLERANCE)
  const first: EquivalenceTerm = { tier: primary, count: wholeCount }
  const remainder = liters - wholeCount * primary.volumeLiters

  if (remainder / liters < NEGLIGIBLE_SHARE) {
    return { kind: 'count', terms: [first], approximate: !isApproximately(wholeCount * primary.volumeLiters, liters) }
  }

  // When the remainder has no compact second term ("1 glass and 200 drops", or nothing smaller
  // than a drop), dropping it could be off by almost half; a decimal count stays accurate.
  const decimal: Equivalence = { kind: 'multiple', tier: primary, count: ratio, approximate: true }
  const secondaryIndex = largestTierAtMost(remainder, tiers.slice(0, primaryIndex))
  if (secondaryIndex < 0) return decimal

  const secondary = tiers[secondaryIndex]!
  const secondaryCount = Math.round(remainder / secondary.volumeLiters)
  if (secondaryCount < 1 || secondaryCount >= WHOLE_COUNT_LIMIT) return decimal

  const total = wholeCount * primary.volumeLiters + secondaryCount * secondary.volumeLiters
  return {
    kind: 'count',
    terms: [first, { tier: secondary, count: secondaryCount }],
    approximate: !isApproximately(total, liters),
  }
}
