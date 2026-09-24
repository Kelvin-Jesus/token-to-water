/**
 * Frame-rate independent motion primitives. Every function takes `dt` in
 * seconds so a 120 Hz phone, a 60 Hz laptop and a throttled 30 Hz tab all
 * animate at the same speed.
 */

export interface SpringState {
  readonly value: number
  readonly velocity: number
}

export interface SpringOptions {
  /** Natural angular frequency (rad/s). Higher = snappier. */
  readonly frequency: number
  /** Optional speed cap in value-units per second; keeps long jumps readable. */
  readonly maxSpeed?: number
}

/**
 * One step of a critically damped spring using the closed-form solution, so it
 * is exact for any `dt` (no overshoot, no explosion on a long frame).
 */
export function stepSpring(state: SpringState, target: number, dt: number, options: SpringOptions): SpringState {
  if (dt <= 0) return state
  const omega = options.frequency
  const offset = state.value - target
  const c2 = state.velocity + omega * offset
  const decay = Math.exp(-omega * dt)
  let value = target + (offset + c2 * dt) * decay
  let velocity = (c2 - omega * (offset + c2 * dt)) * decay

  const maxSpeed = options.maxSpeed
  if (maxSpeed !== undefined && Math.abs(value - state.value) > maxSpeed * dt) {
    // Constant-speed cruise; the spring takes over again once it is close enough.
    const direction = Math.sign(value - state.value)
    value = state.value + direction * maxSpeed * dt
    velocity = direction * maxSpeed
  }
  return { value, velocity }
}

/** Exponential smoothing expressed as a half-life, independent of frame rate. */
export function damp(current: number, target: number, halfLife: number, dt: number): number {
  if (halfLife <= 0) return target
  return target + (current - target) * 2 ** (-dt / halfLife)
}

/** Blend factor for `dt` equivalent to `damp` — for interpolating things that are not plain numbers. */
export function dampFactor(halfLife: number, dt: number): number {
  if (halfLife <= 0) return 1
  return 1 - 2 ** (-dt / halfLife)
}
