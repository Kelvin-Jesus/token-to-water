import type { PerformanceTier, ShapeId } from '@/types'
import { clamp, smoothstep } from '@/lib/utils'
import type { ScenePalette } from './palette'

/**
 * Container silhouettes.
 *
 * Each shape lives in a unit box `x ∈ [0, aspect]`, `y ∈ [0, 1]` (y down) and
 * is scaled uniformly by the box height, so circles stay circles. The fillable
 * interior is a polygon; its area-vs-height curve is precomputed so a 50 % fill
 * shows half the *area* — a bottle's narrow neck fills quickly, a lake's wide
 * surface slowly — instead of naively half the height.
 */

export type Point = readonly [x: number, y: number]

export interface Bounds {
  readonly x0: number
  readonly y0: number
  readonly x1: number
  readonly y1: number
}

export interface DecorContext {
  readonly ctx: CanvasRenderingContext2D
  /** Unit x → screen x. */
  readonly x: (u: number) => number
  /** Unit y → screen y. */
  readonly y: (v: number) => number
  /** Unit length → screen pixels. */
  readonly s: (length: number) => number
  readonly palette: ScenePalette
  readonly quality: PerformanceTier
  /** Seconds since the scene started, for animated details. */
  readonly time: number
  /** On-screen height of the unit box in pixels; fine details are skipped when small. */
  readonly size: number
}

export interface WaterDecorContext extends DecorContext {
  /** Unit y of the water surface. */
  readonly level: number
}

interface ShapeDefinition {
  readonly aspect: number
  /** Above ground (sits on y = 0) or dug into it (pools, lakes, oceans). */
  readonly placement: 'above' | 'below'
  /** Fillable region. Open-top shapes start at the top-left rim and end at the top-right rim. */
  readonly interior: readonly Point[]
  /** Stroke the walls but not the rim (glasses, buckets, basins). */
  readonly openTop: boolean
  /** Visual extent including decorations, for framing and culling. Defaults to the unit box. */
  readonly bounds?: Bounds
  readonly back?: (d: DecorContext) => void
  readonly front?: (d: DecorContext) => void
  /** Drawn inside the water clip, after the water body (currents, bubbles). */
  readonly inWater?: (d: WaterDecorContext) => void
}

export interface Shape extends ShapeDefinition {
  readonly bounds: Bounds
  /** Interior extents in unit coordinates. */
  readonly top: number
  readonly bottom: number
  readonly left: number
  readonly right: number
  /** Unit y of the water surface when `fill` (0..1) of the interior *area* is full. */
  levelForFill(fill: number): number
  /** Inverse of `levelForFill`. */
  fillForLevel(level: number): number
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

/** Points on an elliptical arc, inclusive of both ends. Angles in radians, y down. */
export function arc(cx: number, cy: number, rx: number, ry: number, from: number, to: number, segments: number): Point[] {
  const points: Point[] = []
  for (let i = 0; i <= segments; i++) {
    const angle = from + ((to - from) * i) / segments
    points.push([cx + rx * Math.cos(angle), cy + ry * Math.sin(angle)])
  }
  return points
}

/** Closed rounded rectangle, clockwise from the top-left corner. */
export function roundedRect(x: number, y: number, w: number, h: number, r: number, segments = 6): Point[] {
  const radius = Math.min(r, w / 2, h / 2)
  const { PI } = Math
  return [
    ...arc(x + radius, y + radius, radius, radius, PI, 1.5 * PI, segments),
    ...arc(x + w - radius, y + radius, radius, radius, 1.5 * PI, 2 * PI, segments),
    ...arc(x + w - radius, y + h - radius, radius, radius, 0, 0.5 * PI, segments),
    ...arc(x + radius, y + h - radius, radius, radius, 0.5 * PI, PI, segments),
  ]
}

/**
 * Open-top vessel with straight (optionally tapered) walls and rounded bottom
 * corners. Starts at the top-left rim, ends at the top-right rim.
 */
export function tub(
  topLeft: number,
  topRight: number,
  top: number,
  bottomLeft: number,
  bottomRight: number,
  bottom: number,
  radius: number,
): Point[] {
  const { PI } = Math
  return [
    [topLeft, top],
    ...arc(bottomLeft + radius, bottom - radius, radius, radius, PI, 0.5 * PI, 6),
    ...arc(bottomRight - radius, bottom - radius, radius, radius, 0.5 * PI, 0, 6),
    [topRight, top],
  ]
}

/** Symmetric closed outline from a half-width profile sampled at the given heights (top → bottom). */
export function profile(cx: number, halfWidth: (v: number) => number, heights: readonly number[]): Point[] {
  const left = heights.map((v): Point => [cx - halfWidth(v), v])
  const right = [...heights].reverse().map((v): Point => [cx + halfWidth(v), v])
  return [...left, ...right]
}

/** Sorted, de-duplicated sample heights: dense where the outline curves, sparse on straight walls. */
function samples(...ranges: readonly (readonly [from: number, to: number, count: number])[]): number[] {
  const values = new Set<number>()
  for (const [from, to, count] of ranges) {
    for (let i = 0; i <= count; i++) values.add(Number((from + ((to - from) * i) / count).toFixed(5)))
  }
  // Plain sort (not toSorted): Safari 15 and older budget-phone WebViews lack ES2023 array methods.
  return [...values].sort((a, b) => a - b)
}

/** Catmull-Rom spline through `points`; y is clamped to [0, 1] so overshoot never bulges above ground or below the box. */
export function smoothPath(points: readonly Point[], perSegment = 6): Point[] {
  const result: Point[] = []
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]!
    const p1 = points[i]!
    const p2 = points[i + 1]!
    const p3 = points[Math.min(points.length - 1, i + 2)]!
    for (let step = 0; step < perSegment; step++) {
      const t = step / perSegment
      const t2 = t * t
      const t3 = t2 * t
      const blend = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
      result.push([blend(p0[0], p1[0], p2[0], p3[0]), clamp(blend(p0[1], p1[1], p2[1], p3[1]), 0, 1)])
    }
  }
  result.push(points[points.length - 1]!)
  return result
}

/** Total width of the polygon's horizontal cross-section at `y` (even-odd rule). */
export function crossSectionWidth(polygon: readonly Point[], y: number): number {
  const crossings: number[] = []
  for (let i = 0; i < polygon.length; i++) {
    const [ax, ay] = polygon[i]!
    const [bx, by] = polygon[(i + 1) % polygon.length]!
    if ((ay <= y && by > y) || (by <= y && ay > y)) crossings.push(ax + ((y - ay) / (by - ay)) * (bx - ax))
  }
  crossings.sort((a, b) => a - b)
  let width = 0
  for (let i = 0; i + 1 < crossings.length; i += 2) width += crossings[i + 1]! - crossings[i]!
  return width
}

/** Shoelace area, used by tests to validate the scanline integration. */
export function polygonArea(polygon: readonly Point[]): number {
  let sum = 0
  for (let i = 0; i < polygon.length; i++) {
    const [ax, ay] = polygon[i]!
    const [bx, by] = polygon[(i + 1) % polygon.length]!
    sum += ax * by - bx * ay
  }
  return Math.abs(sum) / 2
}

const SCAN_ROWS = 240

function compile(definition: ShapeDefinition): Shape {
  const { interior } = definition
  if (interior.length < 3) throw new Error('shape interior needs at least three points')
  let top = Infinity
  let bottom = -Infinity
  let left = Infinity
  let right = -Infinity
  for (const [x, y] of interior) {
    top = Math.min(top, y)
    bottom = Math.max(bottom, y)
    left = Math.min(left, x)
    right = Math.max(right, x)
  }

  // cumulative[i] = area below the row at height `bottom - i·step` (filling from the bottom up).
  const step = (bottom - top) / SCAN_ROWS
  const cumulative = new Float64Array(SCAN_ROWS + 1)
  let previousWidth = crossSectionWidth(interior, bottom - step * 0.5e-3)
  for (let i = 1; i <= SCAN_ROWS; i++) {
    const y = i === SCAN_ROWS ? top + step * 0.5e-3 : bottom - i * step
    const width = crossSectionWidth(interior, y)
    cumulative[i] = cumulative[i - 1]! + ((previousWidth + width) / 2) * step
    previousWidth = width
  }
  const totalArea = cumulative[SCAN_ROWS]!

  const levelForFill = (fill: number): number => {
    if (!(fill > 0)) return bottom
    if (fill >= 1) return top
    const target = fill * totalArea
    let low = 0
    let high = SCAN_ROWS
    while (high - low > 1) {
      const mid = (low + high) >> 1
      if (cumulative[mid]! < target) low = mid
      else high = mid
    }
    const span = cumulative[high]! - cumulative[low]!
    const t = span > 0 ? (target - cumulative[low]!) / span : 0
    return bottom - (low + t) * step
  }

  const fillForLevel = (level: number): number => {
    const rows = clamp((bottom - level) / step, 0, SCAN_ROWS)
    const index = Math.floor(rows)
    if (index >= SCAN_ROWS) return 1
    const t = rows - index
    return (cumulative[index]! + (cumulative[index + 1]! - cumulative[index]!) * t) / totalArea
  }

  return {
    ...definition,
    bounds: definition.bounds ?? { x0: 0, y0: 0, x1: definition.aspect, y1: 1 },
    top,
    bottom,
    left,
    right,
    levelForFill,
    fillForLevel,
  }
}

// ---------------------------------------------------------------------------
// Drawing helpers for decorations (all coordinates in unit space)
// ---------------------------------------------------------------------------

function tracePolygon(d: DecorContext, points: readonly Point[], close = true): void {
  const { ctx } = d
  ctx.beginPath()
  points.forEach(([x, y], index) => (index === 0 ? ctx.moveTo(d.x(x), d.y(y)) : ctx.lineTo(d.x(x), d.y(y))))
  if (close) ctx.closePath()
}

function fillPolygon(d: DecorContext, points: readonly Point[], color: string): void {
  tracePolygon(d, points)
  d.ctx.fillStyle = color
  d.ctx.fill()
}

function fillRoundRect(d: DecorContext, x: number, y: number, w: number, h: number, r: number, color: string): void {
  fillPolygon(d, roundedRect(x, y, w, h, r, 3), color)
}

function line(d: DecorContext, points: readonly Point[], width: number, color: string, alpha = 1): void {
  const { ctx } = d
  tracePolygon(d, points, false)
  ctx.globalAlpha = alpha
  ctx.lineWidth = Math.max(1, d.s(width))
  ctx.strokeStyle = color
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.stroke()
  ctx.globalAlpha = 1
}

function circle(d: DecorContext, x: number, y: number, r: number, color: string): void {
  const { ctx } = d
  ctx.beginPath()
  ctx.arc(d.x(x), d.y(y), Math.max(0.5, d.s(r)), 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
}

/** A small glossy streak that sells "this is glass/plastic". Skipped on low quality. */
function gloss(d: DecorContext, from: Point, to: Point, width: number): void {
  if (d.quality === 'low' || d.size < 40) return
  line(d, [from, to], width, d.palette.highlight)
}

function tree(d: DecorContext, x: number, height: number, dark = false): void {
  line(d, [[x, 0], [x, -height * 0.45]], height * 0.08, d.palette.vehicleDark)
  circle(d, x, -height * 0.62, height * 0.3, dark ? d.palette.foliageDark : d.palette.foliage)
  if (d.quality === 'high') circle(d, x + height * 0.12, -height * 0.5, height * 0.2, d.palette.foliageDark)
}

function wheel(d: DecorContext, x: number, y: number, r: number): void {
  circle(d, x, y, r, d.palette.tire)
  circle(d, x, y, r * 0.45, d.palette.hub)
}

/** Interior x of a straight wall between (x0, y0) and (x1, y1) at height y. */
function wallX(x0: number, y0: number, x1: number, y1: number, y: number): number {
  return x0 + ((y - y0) / (y1 - y0)) * (x1 - x0)
}

const bump = (v: number, center: number, width: number) => Math.max(0, 1 - ((v - center) / width) ** 2)

// ---------------------------------------------------------------------------
// Shape definitions
// ---------------------------------------------------------------------------

function dropShape(): ShapeDefinition {
  const aspect = 0.77
  // Teardrop curve x = sin t · sin(t/2), y = cos t: tip at the top, round at the bottom.
  const maxHalfWidth = 0.7698
  const interior: Point[] = []
  const segments = 72
  for (let i = 0; i < segments; i++) {
    const t = (i / segments) * Math.PI * 2
    const x = (Math.sin(t) * Math.sin(t / 2)) / maxHalfWidth
    interior.push([aspect / 2 + (x * aspect) / 2, (1 - Math.cos(t)) / 2])
  }
  return {
    aspect,
    placement: 'above',
    interior,
    openTop: false,
    front: (d) => gloss(d, [0.22, 0.52], [0.2, 0.7], 0.05),
  }
}

function spoonShape(): ShapeDefinition {
  // Side view: a shallow bowl on the left, handle rising to the right.
  return {
    aspect: 2.6,
    placement: 'above',
    interior: arc(0.62, 0.4, 0.58, 0.56, Math.PI, 0, 36),
    openTop: true,
    front: (d) => {
      const { ctx } = d
      ctx.beginPath()
      ctx.moveTo(d.x(1.18), d.y(0.42))
      ctx.quadraticCurveTo(d.x(1.85), d.y(0.42), d.x(2.5), d.y(0.1))
      ctx.lineWidth = Math.max(1.5, d.s(0.11))
      ctx.lineCap = 'round'
      ctx.strokeStyle = d.palette.stroke
      ctx.stroke()
      line(d, [[0.04, 0.4], [1.2, 0.4]], 0.02, d.palette.stroke, 0.45)
    },
  }
}

function glassShape(): ShapeDefinition {
  return {
    aspect: 0.72,
    placement: 'above',
    interior: tub(0.03, 0.69, 0.03, 0.1, 0.62, 0.86, 0.05),
    openTop: true,
    front: (d) => {
      d.ctx.globalAlpha = 0.35
      fillRoundRect(d, 0.1, 0.86, 0.52, 0.12, 0.03, d.palette.stroke)
      d.ctx.globalAlpha = 1
      gloss(d, [0.11, 0.14], [0.155, 0.74], 0.025)
    },
  }
}

function bottleShape(options: {
  aspect: number
  radius: number
  neck: number
  neckTop: number
  shoulderStart: number
  shoulderEnd: number
  label: readonly [number, number]
  ribs: readonly number[]
}): ShapeDefinition {
  const { aspect, radius, neck, neckTop, shoulderStart, shoulderEnd, label, ribs } = options
  const cx = aspect / 2
  const corner = 0.035
  const halfWidth = (v: number): number => {
    if (v < shoulderStart) return neck
    if (v < shoulderEnd) return neck + (radius - neck) * smoothstep(shoulderStart, shoulderEnd, v)
    if (v > 1 - corner) return radius - corner + Math.sqrt(Math.max(0, corner ** 2 - (v - (1 - corner)) ** 2))
    let width = radius - 0.008 * bump(v, (label[0] + label[1]) / 2, 0.08)
    for (const rib of ribs) width -= 0.012 * bump(v, rib, 0.018)
    return width
  }
  const heights = samples(
    [neckTop, shoulderStart, 2],
    [shoulderStart, shoulderEnd, 14],
    [shoulderEnd, 1 - corner, 40],
    [1 - corner, 1, 8],
  )
  return {
    aspect,
    placement: 'above',
    interior: profile(cx, halfWidth, heights),
    openTop: false,
    bounds: { x0: 0, y0: 0, x1: aspect, y1: 1 },
    front: (d) => {
      fillRoundRect(d, cx - neck - 0.012, 0.012, (neck + 0.012) * 2, neckTop - 0.005, 0.012, d.palette.accent)
      // Translucent wrap-around label: reads as "bottle" while the water level stays visible through it.
      fillRoundRect(d, cx - radius + 0.004, label[0], (radius - 0.004) * 2, label[1] - label[0], 0.004, d.palette.highlight)
      line(d, [[cx - radius + 0.02, (label[0] + label[1]) / 2], [cx + radius - 0.02, (label[0] + label[1]) / 2]], 0.012, d.palette.accent, 0.8)
      for (const rib of ribs) line(d, [[cx - radius + 0.02, rib], [cx + radius - 0.02, rib]], 0.006, d.palette.stroke, 0.4)
      gloss(d, [cx - radius + 0.045, shoulderEnd + 0.04], [cx - radius + 0.045, 0.9], 0.018)
    },
  }
}

function bucketShape(): ShapeDefinition {
  const [topLeft, topRight, rim, bottomLeft, bottomRight, bottom] = [0.03, 0.92, 0.2, 0.13, 0.82, 0.99]
  return {
    aspect: 0.95,
    placement: 'above',
    interior: tub(topLeft, topRight, rim, bottomLeft, bottomRight, bottom, 0.05),
    openTop: true,
    front: (d) => {
      line(d, arc(0.475, 0.22, 0.44, 0.2, Math.PI, 2 * Math.PI, 24), 0.018, d.palette.stroke)
      line(d, [[0.0, rim], [0.95, rim]], 0.035, d.palette.stroke)
      const bandY = 0.34
      line(
        d,
        [
          [wallX(topLeft, rim, bottomLeft, bottom, bandY), bandY],
          [wallX(topRight, rim, bottomRight, bottom, bandY), bandY],
        ],
        0.012,
        d.palette.stroke,
        0.4,
      )
      gloss(d, [0.12, 0.3], [0.19, 0.9], 0.02)
    },
  }
}

function jugShape(): ShapeDefinition {
  const cx = 0.29
  const radius = 0.27
  const corner = 0.05
  const grooves = [0.52, 0.76]
  const halfWidth = (v: number): number => {
    if (v < 0.13) return 0.085
    if (v < 0.3) return 0.085 + (radius - 0.085) * smoothstep(0.13, 0.3, v)
    if (v > 1 - corner) return radius - corner + Math.sqrt(Math.max(0, corner ** 2 - (v - (1 - corner)) ** 2))
    return radius - grooves.reduce((sum, groove) => sum + 0.018 * bump(v, groove, 0.035), 0)
  }
  return {
    aspect: 0.58,
    placement: 'above',
    interior: profile(cx, halfWidth, samples([0.06, 0.13, 2], [0.13, 0.3, 14], [0.3, 1 - corner, 48], [1 - corner, 1, 8])),
    openTop: false,
    front: (d) => {
      fillRoundRect(d, cx - 0.11, 0.0, 0.22, 0.07, 0.02, d.palette.accent)
      for (const groove of grooves) line(d, [[cx - radius + 0.03, groove], [cx + radius - 0.03, groove]], 0.008, d.palette.stroke, 0.35)
      gloss(d, [cx - radius + 0.06, 0.36], [cx - radius + 0.06, 0.9], 0.02)
    },
  }
}

function drumShape(): ShapeDefinition {
  return {
    aspect: 0.66,
    placement: 'above',
    interior: roundedRect(0.02, 0.03, 0.62, 0.96, 0.035),
    openTop: false,
    front: (d) => {
      for (const y of [0.035, 0.985]) line(d, [[0.005, y], [0.655, y]], 0.03, d.palette.stroke)
      for (const y of [0.35, 0.67]) line(d, [[0.02, y], [0.64, y]], 0.022, d.palette.stroke, 0.8)
      fillRoundRect(d, 0.44, 0.0, 0.08, 0.035, 0.01, d.palette.stroke)
      gloss(d, [0.1, 0.1], [0.1, 0.92], 0.02)
    },
  }
}

function tankShape(): ShapeDefinition {
  // The blue polyethylene "caixa d'água": a truncated cone under a domed lid.
  return {
    aspect: 1.35,
    placement: 'above',
    interior: tub(0.05, 1.3, 0.3, 0.2, 1.15, 0.99, 0.07),
    openTop: false,
    front: (d) => {
      tracePolygon(d, arc(0.675, 0.31, 0.64, 0.24, Math.PI, 2 * Math.PI, 28))
      d.ctx.fillStyle = d.palette.lid
      d.ctx.fill()
      fillRoundRect(d, 0.0, 0.27, 1.35, 0.065, 0.03, d.palette.lid)
      fillRoundRect(d, 0.61, 0.03, 0.13, 0.06, 0.02, d.palette.lid)
      for (const y of [0.55, 0.8]) {
        line(d, [[wallX(0.05, 0.3, 0.2, 0.99, y), y], [wallX(1.3, 0.3, 1.15, 0.99, y), y]], 0.01, d.palette.stroke, 0.35)
      }
    },
  }
}

function truckShape(large: boolean): ShapeDefinition {
  const aspect = large ? 3.2 : 2.6
  const tankEnd = large ? 2.35 : 1.75
  const cab = large ? 2.46 : 1.86
  const wheels = large ? [0.45, 1.05, 1.75, 2.85] : [0.42, 1.3, 2.22]
  const straps = large ? [0.7, 1.4, 2.0] : [0.6, 1.2]
  return {
    aspect,
    placement: 'above',
    interior: roundedRect(0.05, 0.07, tankEnd - 0.05, 0.55, 0.27, 10),
    openTop: false,
    front: (d) => {
      fillRoundRect(d, 0.02, 0.64, aspect - 0.06, 0.09, 0.02, d.palette.vehicleDark)
      fillRoundRect(d, cab, 0.16, 0.7, 0.56, 0.08, d.palette.vehicle)
      fillRoundRect(d, cab + 0.3, 0.23, 0.33, 0.2, 0.03, d.palette.window)
      fillRoundRect(d, 0.8, 0.02, 0.26, 0.06, 0.02, d.palette.stroke)
      for (const x of straps) line(d, [[x, 0.08], [x, 0.61]], 0.02, d.palette.stroke, 0.55)
      for (const x of wheels) wheel(d, x, 0.82, 0.15)
    },
  }
}

function coping(d: DecorContext, from: number, to: number): void {
  d.ctx.globalAlpha = 0.7
  fillRoundRect(d, from, -0.035, to - from, 0.04, 0.01, d.palette.stroke)
  d.ctx.globalAlpha = 1
}

/** Pool ladder whose rails hook over the wall on the `direction` side (+1 = right, -1 = left). */
function ladder(d: DecorContext, x: number, depth: number, direction: 1 | -1): void {
  const radius = 0.09
  const rails = [x, x + 0.08 * direction]
  for (const rail of rails) {
    const [from, to] = direction > 0 ? [Math.PI, 2 * Math.PI] : [0, -Math.PI]
    const landing = rail + 2 * radius * direction
    line(d, [[rail, depth], ...arc(rail + radius * direction, -0.1, radius, radius, from, to, 8), [landing, 0]], 0.018, d.palette.stroke)
  }
  for (let y = 0.12; y < depth; y += 0.16) line(d, [[rails[0]!, y], [rails[1]!, y]], 0.014, d.palette.stroke)
}

function poolShape(): ShapeDefinition {
  return {
    aspect: 3.2,
    placement: 'below',
    interior: tub(0.1, 3.1, 0, 0.1, 3.1, 1, 0.14),
    openTop: true,
    bounds: { x0: 0, y0: -0.3, x1: 3.2, y1: 1 },
    front: (d) => {
      coping(d, 0, 0.14)
      coping(d, 3.06, 3.2)
      ladder(d, 2.88, 0.6, 1)
    },
  }
}

function largePoolShape(): ShapeDefinition {
  return {
    aspect: 4,
    placement: 'below',
    // Shallow end on the left, sloping to a deep end for the diving board.
    interior: [
      [0.08, 0],
      [0.08, 0.4],
      [0.1, 0.47],
      [0.16, 0.5],
      [1.5, 0.52],
      [2.4, 0.97],
      [2.46, 1],
      [3.84, 1],
      [3.9, 0.97],
      [3.92, 0.9],
      [3.92, 0],
    ],
    openTop: true,
    bounds: { x0: 0, y0: -0.34, x1: 4, y1: 1 },
    front: (d) => {
      coping(d, 0, 0.12)
      coping(d, 3.88, 4)
      ladder(d, 0.24, 0.4, -1)
      fillRoundRect(d, 3.62, -0.3, 0.12, 0.3, 0.02, d.palette.stroke)
      fillRoundRect(d, 2.95, -0.32, 0.85, 0.04, 0.02, d.palette.accent)
    },
  }
}

function olympicPoolShape(): ShapeDefinition {
  return {
    aspect: 5,
    placement: 'below',
    interior: tub(0.06, 4.94, 0, 0.06, 4.94, 1, 0.05),
    openTop: true,
    bounds: { x0: 0, y0: -0.15, x1: 5, y1: 1 },
    front: (d) => {
      coping(d, 0, 0.08)
      coping(d, 4.92, 5)
      fillRoundRect(d, 0.0, -0.12, 0.14, 0.09, 0.015, d.palette.stroke)
      fillRoundRect(d, 4.86, -0.12, 0.14, 0.09, 0.015, d.palette.stroke)
      // The black "T" lane marking on the pool floor.
      line(d, [[0.45, 0.95], [4.55, 0.95]], 0.025, d.palette.vehicleDark, 0.7)
      line(d, [[0.45, 0.88], [0.45, 0.99]], 0.025, d.palette.vehicleDark, 0.7)
      line(d, [[4.55, 0.88], [4.55, 0.99]], 0.025, d.palette.vehicleDark, 0.7)
    },
  }
}

function lakeShape(): ShapeDefinition {
  return {
    aspect: 4.5,
    placement: 'below',
    interior: smoothPath([
      [0, 0],
      [0.3, 0.14],
      [0.7, 0.4],
      [1.2, 0.68],
      [1.8, 0.88],
      [2.5, 1],
      [3.1, 0.92],
      [3.6, 0.7],
      [4.0, 0.42],
      [4.3, 0.16],
      [4.5, 0],
    ]),
    openTop: true,
    bounds: { x0: -0.6, y0: -0.45, x1: 5.1, y1: 1 },
    front: (d) => {
      tree(d, -0.2, 0.36)
      tree(d, -0.45, 0.26, true)
      tree(d, 4.72, 0.32)
      tree(d, 4.95, 0.24, true)
    },
  }
}

function riverShape(): ShapeDefinition {
  return {
    aspect: 5,
    placement: 'below',
    interior: smoothPath([
      [0, 0],
      [0.4, 0.22],
      [0.9, 0.6],
      [1.5, 0.86],
      [2.3, 0.97],
      [3.0, 1],
      [3.6, 0.9],
      [4.1, 0.66],
      [4.6, 0.3],
      [5, 0],
    ]),
    openTop: true,
    bounds: { x0: -1.1, y0: -0.25, x1: 6.1, y1: 1 },
    front: (d) => {
      // Rainforest canopy along both banks.
      for (let i = 0; i < 11; i++) {
        const radius = 0.07 + (i % 2) * 0.025
        const lift = 0.05 + (i % 3) * 0.02
        circle(d, -0.06 - i * 0.09, -lift, radius, i % 2 ? d.palette.foliageDark : d.palette.foliage)
        circle(d, 5.06 + i * 0.09, -lift, radius, i % 2 ? d.palette.foliage : d.palette.foliageDark)
      }
    },
    inWater: (d) => {
      if (d.quality === 'low' || d.size < 60) return
      // Current streaks drifting downstream.
      const depth = 1 - d.level
      for (let i = 0; i < 9; i++) {
        const y = d.level + depth * (0.15 + (i / 9) * 0.7)
        const x = (((d.time * 0.12 + i * 0.37) % 1) + 1) % 1
        const start = 0.4 + x * 4
        line(d, [[start, y], [start + 0.35, y]], 0.012, d.palette.waterSurface, 0.35)
      }
    },
  }
}

function landMass(d: DecorContext, points: readonly Point[]): void {
  fillPolygon(d, points, d.palette.land)
}

function seaShape(): ShapeDefinition {
  return {
    aspect: 4.5,
    placement: 'below',
    interior: smoothPath([
      [0, 0],
      [0.3, 0.08],
      [0.55, 0.14],
      [0.8, 0.45],
      [1.1, 0.8],
      [1.6, 0.95],
      [2.2, 1],
      [2.8, 0.9],
      [3.1, 0.96],
      [3.5, 0.7],
      [3.8, 0.25],
      [4.1, 0.1],
      [4.5, 0],
    ]),
    openTop: true,
    bounds: { x0: -0.95, y0: -0.3, x1: 5.45, y1: 1 },
    front: (d) => {
      landMass(d, [[-0.9, 0], [-0.6, -0.18], [-0.35, -0.08], [-0.15, -0.22], [0.02, 0]])
      landMass(d, [[4.48, 0], [4.7, -0.16], [4.95, -0.06], [5.2, -0.25], [5.4, 0]])
    },
  }
}

function oceanShape(): ShapeDefinition {
  return {
    aspect: 5,
    placement: 'below',
    // Continental shelves at the edges and the Mid-Atlantic Ridge (with its rift valley) in the middle.
    interior: smoothPath(
      [
        [0, 0],
        [0.35, 0.05],
        [0.6, 0.1],
        [0.9, 0.55],
        [1.3, 0.9],
        [1.8, 0.97],
        [2.2, 0.9],
        [2.38, 0.62],
        [2.5, 0.68],
        [2.62, 0.62],
        [2.8, 0.9],
        [3.3, 0.98],
        [3.9, 0.9],
        [4.3, 0.5],
        [4.55, 0.1],
        [4.75, 0.05],
        [5, 0],
      ],
      4,
    ),
    openTop: true,
    bounds: { x0: -1.25, y0: -0.25, x1: 6.35, y1: 1 },
    front: (d) => {
      landMass(d, [[-1.2, 0], [-1.0, -0.12], [-0.6, -0.08], [-0.3, -0.16], [0.02, 0]])
      landMass(d, [[4.98, 0], [5.3, -0.14], [5.7, -0.1], [6.1, -0.2], [6.3, 0]])
    },
  }
}

function globeShape(): ShapeDefinition {
  const radius = 0.49
  return {
    aspect: 1,
    placement: 'above',
    interior: arc(0.5, 0.5, radius, radius, -Math.PI / 2, 1.5 * Math.PI, 96).slice(0, -1),
    openTop: false,
    bounds: { x0: -0.12, y0: -0.12, x1: 1.12, y1: 1 },
    back: (d) => {
      if (d.quality === 'low') return
      const { ctx } = d
      const glow = ctx.createRadialGradient(d.x(0.5), d.y(0.5), d.s(radius), d.x(0.5), d.y(0.5), d.s(radius * 1.22))
      glow.addColorStop(0, 'rgba(56, 189, 248, 0.35)')
      glow.addColorStop(1, 'rgba(56, 189, 248, 0)')
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(d.x(0.5), d.y(0.5), d.s(radius * 1.22), 0, Math.PI * 2)
      ctx.fill()
    },
    front: (d) => {
      const { ctx } = d
      ctx.save()
      ctx.beginPath()
      ctx.arc(d.x(0.5), d.y(0.5), d.s(radius), 0, Math.PI * 2)
      ctx.clip()
      for (const v of [0.2, 0.35, 0.5, 0.65, 0.8]) line(d, [[0, v], [1, v]], 0.004, d.palette.highlight, 0.5)
      for (const k of [0.25, 0.6, 0.88]) {
        ctx.beginPath()
        ctx.ellipse(d.x(0.5), d.y(0.5), d.s(radius * k), d.s(radius), 0, 0, Math.PI * 2)
        ctx.globalAlpha = 0.5
        ctx.lineWidth = Math.max(1, d.s(0.004))
        ctx.strokeStyle = d.palette.highlight
        ctx.stroke()
        ctx.globalAlpha = 1
      }
      ctx.restore()
      gloss(d, [0.26, 0.3], [0.34, 0.2], 0.03)
    },
  }
}

const DEFINITIONS: Readonly<Record<ShapeId, () => ShapeDefinition>> = {
  drop: dropShape,
  spoon: spoonShape,
  glass: glassShape,
  'bottle-small': () =>
    bottleShape({
      aspect: 0.36,
      radius: 0.165,
      neck: 0.055,
      neckTop: 0.1,
      shoulderStart: 0.2,
      shoulderEnd: 0.36,
      label: [0.5, 0.7],
      ribs: [],
    }),
  bottle: () =>
    bottleShape({
      aspect: 0.32,
      radius: 0.15,
      neck: 0.045,
      neckTop: 0.09,
      shoulderStart: 0.17,
      shoulderEnd: 0.32,
      label: [0.4, 0.56],
      ribs: [0.72, 0.79, 0.86],
    }),
  bucket: bucketShape,
  jug: jugShape,
  drum: drumShape,
  tank: tankShape,
  truck: () => truckShape(false),
  'truck-large': () => truckShape(true),
  pool: poolShape,
  'pool-large': largePoolShape,
  'pool-olympic': olympicPoolShape,
  lake: lakeShape,
  river: riverShape,
  sea: seaShape,
  ocean: oceanShape,
  globe: globeShape,
}

const cache = new Map<ShapeId, Shape>()

/** Compiled shape, built on first use (the area tables cost a few hundred microseconds each). */
export function getShape(id: ShapeId): Shape {
  let shape = cache.get(id)
  if (!shape) {
    shape = compile(DEFINITIONS[id]())
    cache.set(id, shape)
  }
  return shape
}

export const SHAPE_IDS = Object.keys(DEFINITIONS) as ShapeId[]
