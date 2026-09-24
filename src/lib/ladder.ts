import { TIERS } from '@/constants/scales'
import type { Tier } from '@/types'

/**
 * Continuous position on the tier ladder, used to pace the animation.
 *
 * Animating the water level in plain log-litres gives each order of
 * magnitude the same time, but the ladder is uneven: bucket → jug is a
 * 1.3× step while small lake → Amazon is 180,000×. The small steps flashed by
 * too fast to follow and the big ones dragged. On the ladder coordinate every
 * rung spans exactly 1 unit, so animating it at a fixed speed gives every
 * container the same screen time.
 *
 * Position p for litres L:
 * - p = -1 is "empty" (the floor volume); p = k when tier k is exactly full;
 * - between rungs, p is interpolated logarithmically: the segment (k-1, k]
 *   covers V(k-1) < L ≤ V(k), which is exactly while tier k is being filled;
 * - beyond the last tier the last step's ratio is extrapolated.
 */

export interface Ladder {
  readonly toPosition: (liters: number) => number
  readonly toLiters: (position: number) => number
}

export function createLadder(floorLiters: number, tiers: readonly Tier[] = TIERS): Ladder {
  if (!(floorLiters > 0)) throw new RangeError('floor volume must be positive')
  if (tiers.length < 2) throw new RangeError('a ladder needs at least two tiers')
  if (floorLiters >= tiers[0]!.volumeLiters) throw new RangeError('floor must be below the first tier')

  // anchors[j + 1] is the volume at position j: [floor, V0, V1, …, V(n-1)].
  const anchors = [floorLiters, ...tiers.map((tier) => tier.volumeLiters)]
  const logs = anchors.map((volume) => Math.log(volume))
  const last = anchors.length - 1
  const lastStep = logs[last]! - logs[last - 1]!

  const toPosition = (liters: number): number => {
    if (Number.isNaN(liters)) throw new RangeError('liters must not be NaN')
    if (liters <= floorLiters) return -1
    const logLiters = Math.log(liters)
    if (logLiters > logs[last]!) return last - 1 + (logLiters - logs[last]!) / lastStep
    let segment = 1
    while (logs[segment]! < logLiters) segment++
    const from = logs[segment - 1]!
    return segment - 2 + (logLiters - from) / (logs[segment]! - from)
  }

  const toLiters = (position: number): number => {
    if (Number.isNaN(position)) throw new RangeError('position must not be NaN')
    if (position <= -1) return floorLiters
    if (position >= last - 1) return Math.exp(logs[last]! + (position - (last - 1)) * lastStep)
    const segment = Math.floor(position) + 2
    const t = position - (segment - 2)
    return Math.exp(logs[segment - 1]! + t * (logs[segment]! - logs[segment - 1]!))
  }

  return { toPosition, toLiters }
}
