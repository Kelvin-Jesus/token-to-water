import { Pause, Play } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { TIER_COUNT, TIERS } from '@/constants/scales'
import { tierLabel } from '@/i18n/tierLabels'
import { useI18n } from '@/i18n/useI18n'
import { resolveTier } from '@/lib/conversion'
import { clamp, cn } from '@/lib/utils'
import { PALETTES } from '@/render/palette'
import { type FrameInfo, WaterScene } from '@/render/scene'
import type { PerformanceTier } from '@/types'
import { formatLength, formatPercent } from '@/utils/formatters'

export interface WaterVisualizerProps {
  readonly liters: number
  readonly quality: PerformanceTier
  readonly reducedMotion: boolean
  readonly theme: 'light' | 'dark'
  /** Receives rAF timestamps while the loop runs at full rate (feeds the FPS monitor). */
  readonly onFrame?: (now: number) => void
  /**
   * Pause/play control. The waves move indefinitely next to other content, so
   * WCAG 2.2.2 (Pause, Stop, Hide) asks for a visible way to stop them.
   */
  readonly onToggleMotion?: () => void
  readonly className?: string
}

export interface PerfStats {
  frames: number
  totalCost: number
  maxCost: number
  lastInfo: FrameInfo | null
}

declare global {
  interface Window {
    /** Frame-cost counters, only present with `?debug` in the URL (read by the performance tests). */
    __TTW_PERF__?: PerfStats
  }
}

/** After this long with only idle waves moving, render every other frame to save battery. */
const IDLE_THROTTLE_MS = 6000

function readDebugOptions(): { enabled: boolean; stressMs: number } {
  const params = new URLSearchParams(window.location.search)
  const enabled = params.has('debug')
  // `stress` burns CPU inside each frame to emulate a slow phone; used to test automatic quality fallback.
  return { enabled, stressMs: enabled ? clamp(Number(params.get('stress')) || 0, 0, 100) : 0 }
}

/**
 * The stage: a canvas driven by `WaterScene`, plus a DOM heads-up display.
 *
 * React only renders the shell. The animation loop, HUD text and canvas
 * drawing all run outside React state, so a 60 FPS animation costs zero
 * re-renders; props flow in through effects that nudge the scene and wake
 * the loop, which stops by itself once nothing moves.
 */
export function WaterVisualizer({
  liters,
  quality,
  reducedMotion,
  theme,
  onFrame,
  onToggleMotion,
  className,
}: WaterVisualizerProps) {
  const { locale, t } = useI18n()
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const tierRef = useRef<HTMLSpanElement>(null)
  const nameRef = useRef<HTMLSpanElement>(null)
  const percentRef = useRef<HTMLSpanElement>(null)
  const ringRef = useRef<HTMLSpanElement>(null)
  const sceneRef = useRef<WaterScene | null>(null)
  const wakeRef = useRef<() => void>(() => {})
  const resizeRef = useRef<() => void>(() => {})
  const hudRef = useRef({ index: -1, percent: '' })
  const [unsupported, setUnsupported] = useState(false)

  const labels = useMemo(() => TIERS.map((tier) => tierLabel(tier.id, locale).title), [locale])

  // Latest props for the long-lived loop, without restarting it on every render.
  const live = useRef({ liters, quality, reducedMotion, theme, onFrame, locale, labels, t })
  useLayoutEffect(() => {
    live.current = { liters, quality, reducedMotion, theme, onFrame, locale, labels, t }
  })

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    const stage = stageRef.current
    if (!canvas || !stage) return
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) {
      setUnsupported(true)
      return
    }

    const initial = live.current
    const debug = readDebugOptions()
    const scene = new WaterScene(ctx, {
      quality: initial.quality,
      reducedMotion: initial.reducedMotion,
      palette: PALETTES[initial.theme],
      labels: initial.labels,
      formatLength: (meters) => formatLength(meters, live.current.locale),
    })
    sceneRef.current = scene
    // Without reduced motion the first paint zooms up from a single drop — the "Powers of Ten" intro.
    scene.setLiters(initial.liters, initial.reducedMotion)

    let frameHandle = 0
    let lastTime: number | null = null
    let settledSince: number | null = null
    let skipFrame = false
    let onScreen = true
    const perf: PerfStats = { frames: 0, totalCost: 0, maxCost: 0, lastInfo: null }
    if (debug.enabled) window.__TTW_PERF__ = perf

    const updateHud = (info: FrameInfo) => {
      const hud = hudRef.current
      const { locale: currentLocale, labels: currentLabels, t: translate } = live.current
      if (info.index !== hud.index) {
        hud.index = info.index
        if (tierRef.current) tierRef.current.textContent = translate('viz.tier', { index: info.index + 1, count: TIER_COUNT })
        if (nameRef.current) nameRef.current.textContent = currentLabels[info.index] ?? ''
        canvas.dataset.tierId = TIERS[info.index]?.id ?? ''
      }
      const fill = Math.min(1, info.fill)
      const percent = formatPercent(fill, currentLocale)
      if (percent !== hud.percent) {
        hud.percent = percent
        if (percentRef.current) percentRef.current.textContent = percent
        ringRef.current?.style.setProperty('--fill', fill.toFixed(3))
      }
      const settled = String(info.settled)
      if (canvas.dataset.settled !== settled) canvas.dataset.settled = settled
    }

    const tick = (now: number) => {
      frameHandle = 0
      const idle = settledSince !== null && now - settledSince > IDLE_THROTTLE_MS
      if (idle) {
        skipFrame = !skipFrame
        if (skipFrame) {
          frameHandle = requestAnimationFrame(tick)
          return
        }
      }
      const dt = lastTime === null ? 0 : (now - lastTime) / 1000
      lastTime = now

      const start = performance.now()
      if (debug.stressMs > 0) {
        const until = start + debug.stressMs
        while (performance.now() < until) {
          // Busy-wait on purpose (debug only): emulates a device too slow for high quality.
        }
      }
      const info = scene.frame(dt)
      if (debug.enabled) {
        const cost = performance.now() - start
        perf.frames++
        perf.totalCost += cost
        perf.maxCost = Math.max(perf.maxCost, cost)
        perf.lastInfo = info
      }
      // Throttled idle frames would read as "slow device" to the FPS monitor, so they are not reported.
      if (!idle) live.current.onFrame?.(now)
      updateHud(info)

      settledSince = info.settled ? (settledSince ?? now) : null
      if (info.animating && onScreen && !document.hidden) frameHandle = requestAnimationFrame(tick)
    }

    const wake = () => {
      settledSince = null
      if (frameHandle === 0 && onScreen && !document.hidden) {
        lastTime = null
        frameHandle = requestAnimationFrame(tick)
      }
    }

    const resize = () => {
      const rect = stage.getBoundingClientRect()
      const width = Math.max(1, Math.round(rect.width))
      const height = Math.max(1, Math.round(rect.height))
      // Capping DPR is the single biggest GPU saving on 3× phones; battery saver caps harder.
      const dpr = Math.min(window.devicePixelRatio || 1, live.current.quality === 'high' ? 2 : 1.5)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      scene.resize(width, height, dpr, { top: height < 380 ? 56 : 68, right: 16, bottom: 40, left: 16 })
      // Resizing clears the canvas; repaint synchronously so there is never a blank frame.
      updateHud(scene.frame(0))
      wake()
    }

    wakeRef.current = wake
    resizeRef.current = resize
    resize()

    const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null
    resizeObserver?.observe(stage)
    if (!resizeObserver) window.addEventListener('resize', resize)

    // Pause entirely while scrolled out of view or in a background tab.
    const intersectionObserver =
      typeof IntersectionObserver === 'function'
        ? new IntersectionObserver(([entry]) => {
            onScreen = entry?.isIntersecting ?? true
            if (onScreen) wake()
          })
        : null
    intersectionObserver?.observe(stage)
    const onVisibilityChange = () => {
      if (!document.hidden) wake()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      cancelAnimationFrame(frameHandle)
      resizeObserver?.disconnect()
      if (!resizeObserver) window.removeEventListener('resize', resize)
      intersectionObserver?.disconnect()
      document.removeEventListener('visibilitychange', onVisibilityChange)
      sceneRef.current = null
      wakeRef.current = () => {}
      resizeRef.current = () => {}
      if (window.__TTW_PERF__ === perf) delete window.__TTW_PERF__
    }
  }, [])

  useEffect(() => {
    sceneRef.current?.setLiters(liters)
    wakeRef.current()
  }, [liters])

  useEffect(() => {
    sceneRef.current?.update({ quality })
    if (canvasRef.current) canvasRef.current.dataset.quality = quality
    // Quality changes the DPR cap, so the backing store is resized too.
    resizeRef.current()
  }, [quality])

  useEffect(() => {
    sceneRef.current?.update({ reducedMotion })
    wakeRef.current()
  }, [reducedMotion])

  useEffect(() => {
    sceneRef.current?.update({ palette: PALETTES[theme] })
    wakeRef.current()
  }, [theme])

  useEffect(() => {
    sceneRef.current?.update({ labels })
    hudRef.current = { index: -1, percent: '' }
    wakeRef.current()
  }, [labels])

  const target = resolveTier(liters)
  const previousTier = TIERS[target.index - 1]
  const description = [
    t('viz.alt', { tier: labels[target.index] ?? '', percent: formatPercent(Math.min(1, target.fill), locale) }),
    previousTier ? t('viz.altPrevious', { previous: tierLabel(previousTier.id, locale).one }) : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      ref={stageRef}
      className={cn(
        'relative isolate overflow-hidden rounded-3xl border border-border bg-muted shadow-sm perf-low:shadow-none',
        className,
      )}
    >
      <canvas
        ref={canvasRef}
        // jsx-a11y lists <canvas> as interactive, but it is not; role="img" + a description is the standard pattern.
        // eslint-disable-next-line jsx-a11y/no-interactive-element-to-noninteractive-role
        role="img"
        aria-label={description}
        data-testid="water-canvas"
        className="absolute inset-0 size-full"
      />
      {unsupported ? (
        <p className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-balance text-muted-foreground">
          {t('viz.fallback')}
        </p>
      ) : null}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2 sm:inset-x-4 sm:top-4"
      >
        <div className="hud-chip flex min-w-0 items-center gap-2 py-1.5 pr-3.5 pl-1.5">
          <span
            ref={tierRef}
            data-testid="hud-tier"
            className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[0.6875rem] font-semibold text-primary-foreground tabular-nums"
          />
          <span ref={nameRef} data-testid="hud-name" className="truncate text-sm font-medium" />
        </div>
        <div className="hud-chip flex shrink-0 items-center gap-2 py-1.5 pr-3 pl-2">
          <span ref={ringRef} className="fill-ring size-4.5" />
          <span ref={percentRef} data-testid="hud-percent" className="text-sm font-semibold tabular-nums" />
        </div>
      </div>
      {onToggleMotion ? (
        <button
          type="button"
          onClick={onToggleMotion}
          aria-label={reducedMotion ? t('viz.play') : t('viz.pause')}
          data-tooltip={reducedMotion ? t('viz.play') : t('viz.pause')}
          data-testid="motion-toggle"
          className="hud-chip absolute right-3 bottom-3 grid size-9 place-items-center text-foreground transition-[background-color,box-shadow] outline-none hover:bg-card focus-visible:ring-[3px] focus-visible:ring-ring/60 pointer-coarse:size-11 sm:right-4 sm:bottom-4 tooltip-up"
        >
          {reducedMotion ? <Play aria-hidden className="size-4" /> : <Pause aria-hidden className="size-4" />}
        </button>
      ) : null}
    </div>
  )
}
