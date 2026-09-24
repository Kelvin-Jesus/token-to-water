import { TIERS } from '@/constants/scales'
import { type Rect, unionRect } from '@/lib/camera'
import type { Tier } from '@/types'
import { getShape, type Shape } from './shapes'

/**
 * World layout: every tier placed side by side on one ground line, in metres.
 *
 * Sizes are honest about *volume*, not shape: each silhouette's box has area
 * ℓ² where ℓ = ∛V is the side of a cube holding the same water. Consecutive
 * tiers therefore differ in on-screen size by (V₂/V₁)^⅔ in area — which is
 * what makes the zoom-out feel like a true "Powers of Ten" jump.
 */

export interface TierLayout {
  readonly tier: Tier
  readonly shape: Shape
  /** The unit box in world space; `h` is the world size of one shape unit. */
  readonly box: Rect
  /** Box plus decorations (trees, lids, ladders) — used for framing and culling. */
  readonly visual: Rect
}

/** Gap between neighbours as a fraction of the geometric mean of their widths. */
const GAP_RATIO = 0.35

export function computeLayout(tiers: readonly Tier[] = TIERS): TierLayout[] {
  const layout: TierLayout[] = []
  let previous: TierLayout | undefined
  for (const tier of tiers) {
    const shape = getShape(tier.shape)
    const side = Math.cbrt(tier.volumeLiters / 1000)
    const height = side / Math.sqrt(shape.aspect)
    const width = side * Math.sqrt(shape.aspect)
    const { bounds } = shape
    // Space the *visual* extents, so a sea's coastline hills never cover the river before it.
    const visualLeft = previous
      ? previous.visual.x + previous.visual.w + GAP_RATIO * Math.sqrt(previous.box.w * width)
      : bounds.x0 * height
    const x = visualLeft - bounds.x0 * height
    const y = shape.placement === 'above' ? -height : 0
    const box: Rect = { x, y, w: width, h: height }
    const visual: Rect = {
      x: x + bounds.x0 * height,
      y: y + bounds.y0 * height,
      w: (bounds.x1 - bounds.x0) * height,
      h: (bounds.y1 - bounds.y0) * height,
    }
    previous = { tier, shape, box, visual }
    layout.push(previous)
  }
  return layout
}

/**
 * What the camera should show while tier `index` fills: the tier itself plus
 * the one it overflowed from, so the size jump is always visible.
 */
export function framingRect(index: number, layout: readonly TierLayout[]): Rect {
  const current = layout[index]
  if (!current) throw new RangeError(`no tier at index ${index}`)
  const previous = layout[index - 1]
  return previous ? unionRect(current.visual, previous.visual) : current.visual
}
