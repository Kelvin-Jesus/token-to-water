/**
 * 2D camera for the Powers-of-Ten zoom.
 *
 * Mapping: screen = world × scale + (x, y). World units are metres with y
 * pointing down (ground at y = 0, above-ground objects at negative y).
 */

export interface Rect {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

export interface Camera {
  readonly scale: number
  readonly x: number
  readonly y: number
}

export interface Insets {
  readonly top: number
  readonly right: number
  readonly bottom: number
  readonly left: number
}

export interface Viewport {
  readonly width: number
  readonly height: number
  readonly insets: Insets
}

export function unionRect(a: Rect, b: Rect): Rect {
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y }
}

/**
 * Camera that fits `rect` inside the viewport's safe area with relative
 * `padding` on every side. Spare vertical space is split by `alignY`
 * (0 = rect at the top, 0.5 = centred, 1 = at the bottom).
 */
export function fitRect(rect: Rect, viewport: Viewport, padding = 0.08, alignY = 0.5): Camera {
  const { insets } = viewport
  const availableWidth = Math.max(1, viewport.width - insets.left - insets.right)
  const availableHeight = Math.max(1, viewport.height - insets.top - insets.bottom)
  // A floor on the extent keeps the scale finite for degenerate (zero-size) rects.
  const paddedWidth = Math.max(rect.w * (1 + 2 * padding), 1e-12)
  const paddedHeight = Math.max(rect.h * (1 + 2 * padding), 1e-12)
  const scale = Math.min(availableWidth / paddedWidth, availableHeight / paddedHeight)
  return {
    scale,
    x: insets.left + availableWidth / 2 - (rect.x + rect.w / 2) * scale,
    y: insets.top + (availableHeight - rect.h * scale) * alignY - rect.y * scale,
  }
}

/** Below this log-scale difference the zoom is treated as a pure pan (the fixed point is at infinity). */
const PURE_PAN_THRESHOLD = 1e-4

/**
 * Move `alpha` of the way from `current` to `target`, zooming around their
 * shared fixed point.
 *
 * Interpolating scale and translation independently makes the camera fly off
 * sideways mid-zoom (the pan is enormous at the zoomed-in scale). Two framings
 * that differ in scale always agree on exactly one world point; keeping that
 * point pinned to the screen turns every transition into a pure zoom — the
 * "Powers of Ten" look. Scale is interpolated geometrically so each order of
 * magnitude takes equal time.
 */
export function stepCamera(current: Camera, target: Camera, alpha: number): Camera {
  if (alpha >= 1) return target
  if (alpha <= 0) return current
  const logRatio = Math.log(target.scale / current.scale)
  if (Math.abs(logRatio) < PURE_PAN_THRESHOLD) {
    return {
      scale: current.scale + (target.scale - current.scale) * alpha,
      x: current.x + (target.x - current.x) * alpha,
      y: current.y + (target.y - current.y) * alpha,
    }
  }
  const scale = current.scale * Math.exp(logRatio * alpha)
  const scaleDelta = current.scale - target.scale
  const fixedX = (target.x - current.x) / scaleDelta
  const fixedY = (target.y - current.y) / scaleDelta
  return {
    scale,
    x: fixedX * current.scale + current.x - fixedX * scale,
    y: fixedY * current.scale + current.y - fixedY * scale,
  }
}

/** True when two cameras would render indistinguishably (sub-pixel pan, < 0.1 % zoom). */
export function camerasMatch(a: Camera, b: Camera, pixelTolerance = 0.25): boolean {
  return (
    Math.abs(Math.log(a.scale / b.scale)) < 1e-3 &&
    Math.abs(a.x - b.x) < pixelTolerance &&
    Math.abs(a.y - b.y) < pixelTolerance
  )
}

export function worldToScreen(camera: Camera, x: number, y: number): { x: number; y: number } {
  return { x: x * camera.scale + camera.x, y: y * camera.scale + camera.y }
}
