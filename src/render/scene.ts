import { TIERS } from '@/constants/scales'
import { type Camera, camerasMatch, fitRect, type Insets, type Rect, stepCamera, type Viewport } from '@/lib/camera'
import { resolveTier } from '@/lib/conversion'
import { dampFactor, type SpringState, stepSpring } from '@/lib/motion'
import { createRandom } from '@/lib/random'
import { clamp, smoothstep } from '@/lib/utils'
import type { PerformanceTier } from '@/types'
import { computeLayout, framingRect, type TierLayout } from './layout'
import { luminance, mixRgb, type Rgb, rgbToCss, type ScenePalette } from './palette'
import { ParticlePool } from './particles'
import type { DecorContext, Point, Shape } from './shapes'

/**
 * The canvas scene: animation state + drawing, independent of React.
 *
 * The component owns the requestAnimationFrame loop and calls `frame(dt)`;
 * this class never schedules anything itself, which keeps it deterministic
 * and testable with a stub context.
 */

export interface SceneSettings {
  readonly quality: PerformanceTier
  readonly reducedMotion: boolean
  readonly palette: ScenePalette
  /** Localised tier titles, indexed like `TIERS` (used for the scale callout). */
  readonly labels: readonly string[]
  readonly formatLength: (meters: number) => string
}

export interface FrameInfo {
  /** Tier currently on screen (follows the animation, not the target). */
  readonly index: number
  /** Its fill, 0..1 (> 1 only past the last tier). */
  readonly fill: number
  /** Camera and water level have reached their targets. */
  readonly settled: boolean
  /** Something still moves (waves, particles, transitions) — schedule another frame. */
  readonly animating: boolean
}

export const CANVAS_FONT = "'Geist Variable', ui-sans-serif, system-ui, sans-serif"

/**
 * The water level animates in log₁₀(litres) so every order of magnitude takes
 * the same time. The floor sits two decades below one drop: "empty".
 */
const LOG_FLOOR = Math.log10(TIERS[0].volumeLiters) - 2
const FLOOR_LITERS = 10 ** LOG_FLOOR
/** Critically damped; capped at ~3 decades/s so a 12-decade jump still shows every tier on the way. */
const LEVEL_SPRING = { frequency: 6.5, maxSpeed: 3.2 } as const
const CAMERA_HALF_LIFE = 0.16
/** Longest step simulated in one frame; a stalled tab should not teleport the animation. */
const MAX_DT = 1 / 15
const FRAMING_PADDING = 0.1
/** Objects stand on the ground, so spare height goes mostly above them (sky), not below (soil). */
const FRAMING_ALIGN_Y = 0.68
const GRAVITY = 900

const DEFAULT_INSETS: Insets = { top: 64, right: 16, bottom: 40, left: 16 }

export class WaterScene {
  readonly layout: readonly TierLayout[] = computeLayout()

  private settings: SceneSettings
  private width = 0
  private height = 0
  private dpr = 1
  private insets: Insets = DEFAULT_INSETS
  private targetLog = LOG_FLOOR
  private targetLiters = 0
  private level: SpringState = { value: LOG_FLOOR, velocity: 0 }
  private camera: Camera | null = null
  private time = 0
  private waveEnergy = 0.4
  private lastIndex = 0
  private lastFill = 0
  private readonly particles = new ParticlePool(72)
  private readonly random = createRandom(0x70ce)
  private readonly stars: Float32Array

  constructor(
    private readonly ctx: CanvasRenderingContext2D,
    settings: SceneSettings,
  ) {
    this.settings = settings
    const random = createRandom(0x57a2)
    this.stars = new Float32Array(90 * 4)
    for (let i = 0; i < this.stars.length; i += 4) {
      this.stars[i] = random()
      this.stars[i + 1] = random() * 0.8
      this.stars[i + 2] = 0.6 + random()
      this.stars[i + 3] = random() * Math.PI * 2
    }
  }

  /** CSS-pixel size of the canvas and device pixel ratio. Snaps the camera (no animated re-fit on resize). */
  resize(width: number, height: number, dpr: number, insets: Insets = DEFAULT_INSETS): void {
    this.width = Math.max(1, width)
    this.height = Math.max(1, height)
    this.dpr = dpr
    this.insets = insets
    this.camera = null
  }

  update(settings: Partial<SceneSettings>): void {
    this.settings = { ...this.settings, ...settings }
    if (settings.reducedMotion) {
      this.level = { value: this.targetLog, velocity: 0 }
      this.camera = null
      this.particles.clear()
    }
    if (settings.quality === 'low') this.particles.clear()
  }

  /** New target volume. `immediate` skips the animation (first paint with reduced motion, tests). */
  setLiters(liters: number, immediate = false): void {
    if (Number.isNaN(liters)) throw new RangeError('liters must not be NaN')
    this.targetLiters = Math.max(0, liters)
    this.targetLog = Math.log10(this.targetLiters + FLOOR_LITERS)
    if (immediate || this.settings.reducedMotion) {
      this.level = { value: this.targetLog, velocity: 0 }
      this.camera = null
    }
  }

  /** Litres currently shown on screen (mid-animation this lags the target). */
  get displayedLiters(): number {
    // Once settled, report the exact target: the log round-trip would leave 0.49999… L in a 0.5 L bottle.
    if (this.level.value === this.targetLog) return this.targetLiters
    return Math.max(0, 10 ** this.level.value - FLOOR_LITERS)
  }

  get viewport(): Viewport {
    return { width: this.width, height: this.height, insets: this.insets }
  }

  get currentCamera(): Camera | null {
    return this.camera
  }

  frame(deltaSeconds: number): FrameInfo {
    const dt = clamp(deltaSeconds, 0, MAX_DT)
    const { reducedMotion, quality } = this.settings
    this.time += dt

    this.level = reducedMotion
      ? { value: this.targetLog, velocity: 0 }
      : stepSpring(this.level, this.targetLog, dt, LEVEL_SPRING)
    // Snap before resolving the tier so the settling frame already reports the exact fill.
    const levelSettled = Math.abs(this.level.value - this.targetLog) < 1e-4 && Math.abs(this.level.velocity) < 1e-3
    if (levelSettled) this.level = { value: this.targetLog, velocity: 0 }

    const position = resolveTier(this.displayedLiters)
    const { index } = position
    const fill = Math.min(1, position.fill)

    if (index !== this.lastIndex) {
      if (index > this.lastIndex && !reducedMotion && quality === 'high') this.splash(this.lastIndex)
      this.waveEnergy += index > this.lastIndex ? 0.9 : 0.3
    } else if (dt > 0) {
      this.waveEnergy += Math.min(3, Math.abs(fill - this.lastFill) / dt) * dt * 1.6
    }
    this.waveEnergy = Math.min(2, this.waveEnergy * Math.exp(-dt / 0.9))
    this.lastIndex = index
    this.lastFill = fill

    const target = fitRect(framingRect(index, this.layout), this.viewport, FRAMING_PADDING, FRAMING_ALIGN_Y)
    this.camera =
      this.camera === null || reducedMotion
        ? target
        : stepCamera(this.camera, target, dampFactor(CAMERA_HALF_LIFE, dt))

    this.particles.update(dt, GRAVITY)

    const settled = levelSettled && camerasMatch(this.camera, target)
    if (settled) this.camera = target

    this.draw(index, fill)
    return {
      index,
      fill: position.fill,
      settled,
      animating: !settled || !reducedMotion || this.particles.count > 0,
    }
  }

  // -------------------------------------------------------------------------
  // Drawing
  // -------------------------------------------------------------------------

  private draw(activeIndex: number, fill: number): void {
    const { ctx, width, height } = this
    const camera = this.camera!
    const { palette } = this.settings

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)

    // How far the camera has pulled back decides the backdrop: indoors → sky → space.
    const metersAcross = Math.log10(width / camera.scale)
    const skyT = smoothstep(0.6, 2.2, metersAcross)
    const spaceT = smoothstep(4.6, 6.4, metersAcross)
    const { indoor, sky, space } = palette.background
    const top = mixRgb(mixRgb(indoor[0], sky[0], skyT), space[0], spaceT)
    const bottom = mixRgb(mixRgb(indoor[1], sky[1], skyT), space[1], spaceT)
    const background = ctx.createLinearGradient(0, 0, 0, height)
    background.addColorStop(0, rgbToCss(top))
    background.addColorStop(1, rgbToCss(bottom))
    ctx.fillStyle = background
    ctx.fillRect(0, 0, width, height)

    const onDark = luminance(mixRgb(top, bottom, 0.5)) < 0.18
    const textColor = onDark ? palette.labelOnDark : palette.label

    if (this.settings.quality === 'high' && spaceT > 0.01) this.drawStars(spaceT)
    // Seen from orbit the ground darkens with the sky, so light-theme sand never glares against space.
    const ground = mixRgb(mixRgb(palette.ground.indoor, palette.ground.outdoor, skyT), space[1], spaceT * 0.75)
    this.drawGround(camera, ground)

    for (let i = 0; i <= activeIndex; i++) {
      const item = this.layout[i]!
      if (!this.isVisible(item.visual, camera)) continue
      this.drawItem(item, i === activeIndex ? fill : 1, i === activeIndex, camera)
    }

    this.drawPreviousLabel(activeIndex, camera, textColor)
    this.particles.draw(ctx, palette.waterTop)
    // The scale bar usually sits on the ground band, not the sky: pick its colour from what is behind it.
    const barBackground = camera.y < height - 30 ? ground : bottom
    this.drawScaleBar(camera, luminance(barBackground) < 0.18 ? palette.labelOnDark : palette.label)
  }

  private toScreen(rect: Rect, camera: Camera): Rect {
    return { x: rect.x * camera.scale + camera.x, y: rect.y * camera.scale + camera.y, w: rect.w * camera.scale, h: rect.h * camera.scale }
  }

  private isVisible(rect: Rect, camera: Camera): boolean {
    const screen = this.toScreen(rect, camera)
    if (screen.w < 0.5 && screen.h < 0.5) return false
    return screen.x < this.width && screen.x + screen.w > 0 && screen.y < this.height && screen.y + screen.h > 0
  }

  private drawStars(strength: number): void {
    const { ctx, width, height, stars, time } = this
    ctx.fillStyle = this.settings.palette.star
    for (let i = 0; i < stars.length; i += 4) {
      ctx.globalAlpha = strength * (0.45 + 0.4 * Math.sin(time * 0.8 + stars[i + 3]!))
      const size = stars[i + 2]!
      ctx.fillRect(stars[i]! * width, stars[i + 1]! * height, size, size)
    }
    ctx.globalAlpha = 1
  }

  private drawGround(camera: Camera, color: Rgb): void {
    const { ctx, width, height } = this
    const groundY = camera.y
    if (groundY >= height) return
    ctx.fillStyle = rgbToCss(color)
    ctx.fillRect(0, Math.max(0, groundY), width, height - Math.max(0, groundY))
    if (groundY >= 0) {
      ctx.fillStyle = this.settings.palette.groundLine
      ctx.fillRect(0, groundY - 0.5, width, 1)
    }
  }

  private trace(points: readonly Point[], x: (u: number) => number, y: (v: number) => number, close: boolean): void {
    const { ctx } = this
    ctx.beginPath()
    for (let i = 0; i < points.length; i++) {
      const [u, v] = points[i]!
      if (i === 0) ctx.moveTo(x(u), y(v))
      else ctx.lineTo(x(u), y(v))
    }
    if (close) ctx.closePath()
  }

  private drawItem(item: TierLayout, fill: number, active: boolean, camera: Camera): void {
    const { ctx } = this
    const { palette, quality } = this.settings
    const { shape } = item
    const unit = item.box.h * camera.scale
    const originX = item.box.x * camera.scale + camera.x
    const originY = item.box.y * camera.scale + camera.y
    const x = (u: number) => originX + u * unit
    const y = (v: number) => originY + v * unit

    // Far-away containers are a few pixels tall: a filled silhouette is all that can be seen.
    if (unit < 6) {
      this.trace(shape.interior, x, y, true)
      ctx.fillStyle = palette.waterMid
      ctx.fill()
      return
    }

    const d: DecorContext = { ctx, x, y, s: (length) => length * unit, palette, quality, time: this.time, size: unit }
    shape.back?.(d)

    this.trace(shape.interior, x, y, true)
    ctx.fillStyle = shape.placement === 'below' ? palette.basin : palette.glass
    ctx.fill()

    if (fill > 0.0002) {
      ctx.save()
      this.trace(shape.interior, x, y, true)
      ctx.clip()
      const level = shape.levelForFill(fill)
      this.drawWater(shape, x, y, level, active, unit)
      shape.inWater?.({ ...d, level })
      ctx.restore()
    }

    this.trace(shape.interior, x, y, !shape.openTop)
    ctx.lineWidth = clamp(unit * 0.018, 1, 3.2)
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.strokeStyle = shape.placement === 'below' ? palette.basinLine : palette.stroke
    ctx.stroke()

    if (unit >= 14) shape.front?.(d)
  }

  private drawWater(
    shape: Shape,
    x: (u: number) => number,
    y: (v: number) => number,
    level: number,
    active: boolean,
    unit: number,
  ): void {
    const { ctx, time } = this
    const { palette, quality, reducedMotion } = this.settings
    const high = quality === 'high'

    // Only the visible slice of a huge (mid-zoom) container is worth tessellating.
    const left = Math.max(x(shape.left) - 2, -8)
    const right = Math.min(x(shape.right) + 2, this.width + 8)
    if (right <= left) return
    const bottom = y(shape.bottom) + 2
    const surface = y(level)
    const span = right - left

    const baseAmplitude = reducedMotion ? 0 : clamp((x(shape.right) - x(shape.left)) * 0.01, 0.8, 6)
    const amplitude = Math.min(baseAmplitude * (0.45 + this.waveEnergy) * (active ? 1 : 0.4), Math.max(0, bottom - surface) * 0.3)
    const wavelength = Math.max(70, (x(shape.right) - x(shape.left)) / 2.3)
    const k = (Math.PI * 2) / wavelength
    const segments = Math.min(high ? 220 : 90, Math.max(8, Math.ceil(span / (high ? 4 : 8))))
    const stepX = span / segments
    const phase = time * 1.8
    const phase2 = time * 2.9

    const wave = (px: number, offset: number, lift: number) =>
      surface -
      lift +
      amplitude * Math.sin(k * px + phase + offset) +
      (high ? amplitude * 0.35 * Math.sin(2.3 * k * px - phase2 + 1.3 + offset) : 0)

    // Back layer: a paler, offset wave gives the surface depth (skipped in battery saver).
    if (high && amplitude > 0.3) {
      ctx.beginPath()
      ctx.moveTo(left, bottom)
      for (let i = 0; i <= segments; i++) ctx.lineTo(left + i * stepX, wave(left + i * stepX, 2.1, amplitude * 0.7))
      ctx.lineTo(right, bottom)
      ctx.closePath()
      ctx.globalAlpha = 0.55
      ctx.fillStyle = palette.waterBack
      ctx.fill()
      ctx.globalAlpha = 1
    }

    const body = ctx.createLinearGradient(0, surface - amplitude, 0, bottom)
    body.addColorStop(0, palette.waterTop)
    body.addColorStop(0.35, palette.waterMid)
    body.addColorStop(1, palette.waterDeep)
    ctx.beginPath()
    ctx.moveTo(left, bottom)
    for (let i = 0; i <= segments; i++) ctx.lineTo(left + i * stepX, wave(left + i * stepX, 0, 0))
    ctx.lineTo(right, bottom)
    ctx.closePath()
    ctx.fillStyle = body
    ctx.fill()

    ctx.beginPath()
    for (let i = 0; i <= segments; i++) {
      const px = left + i * stepX
      if (i === 0) ctx.moveTo(px, wave(px, 0, 0))
      else ctx.lineTo(px, wave(px, 0, 0))
    }
    ctx.lineWidth = high ? 2 : 1.5
    ctx.strokeStyle = palette.waterSurface
    ctx.globalAlpha = 0.9
    ctx.stroke()
    ctx.globalAlpha = 1

    // Bubbles: stateless (position derived from time), so they cost nothing to keep around.
    if (high && active && !reducedMotion && bottom - surface > 40 && unit > 80) {
      ctx.fillStyle = palette.foam
      const depth = bottom - surface
      for (let i = 0; i < 7; i++) {
        const progress = (time * (0.12 + (i % 3) * 0.05) + i * 0.37) % 1
        const bx = left + span * (0.15 + ((i * 0.618) % 0.7))
        const by = bottom - progress * depth
        ctx.globalAlpha = 0.5 * (1 - progress)
        ctx.beginPath()
        ctx.arc(bx + Math.sin(time * 2 + i) * 3, by, 1.5 + (i % 3), 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }
  }

  private splash(fromIndex: number): void {
    const camera = this.camera
    const item = this.layout[fromIndex]
    if (!camera || !item) return
    const unit = item.box.h * camera.scale
    const rimX = (item.box.x + ((item.shape.left + item.shape.right) / 2) * item.box.h) * camera.scale + camera.x
    const rimY = (item.box.y + item.shape.top * item.box.h) * camera.scale + camera.y
    if (rimX < 0 || rimX > this.width || rimY < 0 || rimY > this.height) return
    const speed = clamp(unit * 2.5, 120, 420)
    for (let i = 0; i < 22; i++) {
      this.particles.spawn(
        rimX + (this.random() - 0.5) * unit * 0.4,
        rimY,
        (this.random() - 0.5) * speed,
        -(0.5 + this.random() * 0.7) * speed,
        0.5 + this.random() * 0.5,
        1.2 + this.random() * 2.4,
      )
    }
  }

  /**
   * Label the container that just overflowed. When it has shrunk to a few
   * pixels, circle it with a callout — otherwise the size comparison (the
   * whole point of the zoom) would be invisible.
   */
  private drawPreviousLabel(activeIndex: number, camera: Camera, color: string): void {
    const previous = this.layout[activeIndex - 1]
    const label = this.settings.labels[activeIndex - 1]
    if (!previous || !label) return
    const rect = this.toScreen(previous.visual, camera)
    const { ctx, width } = this
    const centerX = rect.x + rect.w / 2
    const centerY = rect.y + rect.h / 2
    if (centerX < -20 || centerX > width + 20) return

    ctx.font = `500 12px ${CANVAS_FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    const textWidth = ctx.measureText(label).width
    const textX = clamp(centerX, textWidth / 2 + 8, width - textWidth / 2 - 8)

    if (rect.w < 22 && rect.h < 22) {
      const radius = Math.max(7, Math.max(rect.w, rect.h) / 2 + 5)
      ctx.strokeStyle = this.settings.palette.accent
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(centerX, centerY - radius)
      ctx.lineTo(centerX, centerY - radius - 16)
      ctx.stroke()
      ctx.fillStyle = color
      ctx.fillText(label, textX, centerY - radius - 22)
      return
    }

    let textY = rect.y - 8
    if (textY < this.insets.top + 4) textY = rect.y + rect.h + 16
    ctx.fillStyle = color
    ctx.globalAlpha = 0.85
    ctx.fillText(label, textX, textY)
    ctx.globalAlpha = 1
  }

  /** Map-style scale bar: the most honest way to show how far the camera has zoomed. */
  private drawScaleBar(camera: Camera, color: string): void {
    const { ctx, width, height } = this
    const targetPixels = clamp(width * 0.22, 64, 140)
    const rawMeters = targetPixels / camera.scale
    const magnitude = 10 ** Math.floor(Math.log10(rawMeters))
    const normalized = rawMeters / magnitude
    const meters = (normalized >= 5 ? 5 : normalized >= 2 ? 2 : 1) * magnitude
    const pixels = meters * camera.scale
    const x0 = this.insets.left
    const y0 = height - 14

    ctx.strokeStyle = color
    ctx.globalAlpha = 0.75
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(x0, y0 - 5)
    ctx.lineTo(x0, y0)
    ctx.lineTo(x0 + pixels, y0)
    ctx.lineTo(x0 + pixels, y0 - 5)
    ctx.stroke()
    ctx.fillStyle = color
    ctx.font = `500 11px ${CANVAS_FONT}`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(this.settings.formatLength(meters), x0 + Math.min(pixels + 8, width - x0 - 60), y0)
    ctx.globalAlpha = 1
  }
}
