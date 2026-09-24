export interface FpsMonitorOptions {
  /** Average FPS below which a measurement window counts as "slow". */
  readonly threshold?: number
  readonly windowMs?: number
  /** Consecutive slow windows required before downgrading, so one GC pause doesn't trigger it. */
  readonly windowsToTrigger?: number
  /** Ignore start-up (font loading, first layout, JIT warm-up). */
  readonly warmupMs?: number
  /** A frame gap longer than this means the loop was paused (hidden tab, idle) — not slow. */
  readonly maxGapMs?: number
}

/**
 * Detects sustained low frame rates from rAF timestamps.
 *
 * Pure (no DOM access, time is passed in) so it is deterministic under test.
 * Downgrading is one-way for the session: flipping back to high quality would
 * just make the frame rate drop again and the visuals oscillate.
 */
export class FpsMonitor {
  private readonly threshold: number
  private readonly windowMs: number
  private readonly windowsToTrigger: number
  private readonly warmupMs: number
  private readonly maxGapMs: number

  private startedAt: number | null = null
  private lastFrameAt: number | null = null
  private windowStartedAt = 0
  private framesInWindow = 0
  private slowWindows = 0
  private triggered = false
  private measuredFps: number | null = null

  constructor(options: FpsMonitorOptions = {}) {
    this.threshold = options.threshold ?? 45
    this.windowMs = options.windowMs ?? 1000
    this.windowsToTrigger = options.windowsToTrigger ?? 2
    this.warmupMs = options.warmupMs ?? 1500
    this.maxGapMs = options.maxGapMs ?? 250
  }

  /** Most recent full-window average, or null before the first window completes. */
  get fps(): number | null {
    return this.measuredFps
  }

  get isDowngraded(): boolean {
    return this.triggered
  }

  /** Feed one rAF timestamp. Returns true exactly once: on the frame that triggers the downgrade. */
  sample(now: number): boolean {
    if (this.startedAt === null || this.lastFrameAt === null) {
      this.startedAt = now
      this.lastFrameAt = now
      this.windowStartedAt = now
      return false
    }

    const gap = now - this.lastFrameAt
    this.lastFrameAt = now
    if (gap > this.maxGapMs || now - this.startedAt < this.warmupMs) {
      this.windowStartedAt = now
      this.framesInWindow = 0
      return false
    }

    this.framesInWindow++
    const elapsed = now - this.windowStartedAt
    if (elapsed < this.windowMs) return false

    const fps = (this.framesInWindow * 1000) / elapsed
    this.measuredFps = fps
    this.windowStartedAt = now
    this.framesInWindow = 0
    this.slowWindows = fps < this.threshold ? this.slowWindows + 1 : 0

    if (!this.triggered && this.slowWindows >= this.windowsToTrigger) {
      this.triggered = true
      return true
    }
    return false
  }

  /** Forget the current window, e.g. after the loop was deliberately paused or throttled. */
  interrupt(): void {
    this.lastFrameAt = null
    this.startedAt = null
    this.framesInWindow = 0
  }
}
