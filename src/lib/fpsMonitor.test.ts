import { describe, expect, it } from 'vitest'
import { FpsMonitor } from './fpsMonitor'

/** Feed frames at a fixed rate for `seconds`, starting at `start` ms. Returns [triggered, endTime]. */
function run(monitor: FpsMonitor, fps: number, seconds: number, start = 0): [boolean, number] {
  const interval = 1000 / fps
  let triggered = false
  let time = start
  for (let i = 0; i <= seconds * fps; i++) {
    time = start + i * interval
    triggered = monitor.sample(time) || triggered
  }
  return [triggered, time]
}

describe('FpsMonitor', () => {
  it('measures the frame rate over one-second windows', () => {
    const monitor = new FpsMonitor({ warmupMs: 0 })
    run(monitor, 60, 2)
    expect(monitor.fps).toBeCloseTo(60, 0)
  })

  it('never downgrades a device holding 60 FPS', () => {
    const monitor = new FpsMonitor()
    expect(run(monitor, 60, 10)[0]).toBe(false)
    expect(monitor.isDowngraded).toBe(false)
  })

  it('downgrades after two consecutive slow windows', () => {
    const monitor = new FpsMonitor({ warmupMs: 0 })
    const [triggered] = run(monitor, 30, 3)
    expect(triggered).toBe(true)
    expect(monitor.isDowngraded).toBe(true)
  })

  it('triggers exactly once', () => {
    const monitor = new FpsMonitor({ warmupMs: 0 })
    let triggers = 0
    for (let i = 0; i < 300; i++) if (monitor.sample(i * 33.3)) triggers++
    expect(triggers).toBe(1)
  })

  it('ignores a single slow window (a GC pause is not a slow device)', () => {
    const monitor = new FpsMonitor({ warmupMs: 0 })
    let [triggered, time] = run(monitor, 60, 2)
    ;[triggered, time] = run(monitor, 30, 1.05, time + 33)
    expect(triggered).toBe(false)
    ;[triggered] = run(monitor, 60, 3, time + 16)
    expect(triggered).toBe(false)
  })

  it('ignores start-up jank during the warm-up period', () => {
    const monitor = new FpsMonitor({ warmupMs: 1500 })
    const [triggered, time] = run(monitor, 20, 1.4)
    expect(triggered).toBe(false)
    expect(run(monitor, 60, 3, time + 16)[0]).toBe(false)
  })

  it('treats long gaps (hidden tab, paused loop) as a pause, not slowness', () => {
    const monitor = new FpsMonitor({ warmupMs: 0 })
    let time = 0
    for (let i = 0; i < 20; i++) {
      time += 500 // two frames per second, but every gap is a pause
      expect(monitor.sample(time)).toBe(false)
    }
    expect(monitor.fps).toBeNull()
  })

  it('restarts measurement after interrupt()', () => {
    const monitor = new FpsMonitor({ warmupMs: 0 })
    const [, time] = run(monitor, 30, 1.5)
    monitor.interrupt()
    expect(run(monitor, 60, 3, time + 5000)[0]).toBe(false)
  })
})
