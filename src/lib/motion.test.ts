import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { damp, dampFactor, type SpringState, stepSpring } from './motion'

function simulate(target: number, seconds: number, dt: number, options = { frequency: 6 }): SpringState {
  let state: SpringState = { value: 0, velocity: 0 }
  for (let t = 0; t < seconds - 1e-9; t += dt) state = stepSpring(state, target, dt, options)
  return state
}

describe('stepSpring', () => {
  it('converges on the target without overshoot (critically damped)', () => {
    let state: SpringState = { value: 0, velocity: 0 }
    let peak = 0
    for (let i = 0; i < 240; i++) {
      state = stepSpring(state, 10, 1 / 60, { frequency: 6 })
      peak = Math.max(peak, state.value)
    }
    expect(state.value).toBeCloseTo(10, 3)
    expect(peak).toBeLessThanOrEqual(10 + 1e-9)
  })

  it('is frame-rate independent: 30, 60 and 144 Hz land in the same place', () => {
    const at30 = simulate(10, 0.5, 1 / 30).value
    const at60 = simulate(10, 0.5, 1 / 60).value
    const at144 = simulate(10, 0.5, 1 / 144).value
    expect(at60).toBeCloseTo(at30, 6)
    expect(at144).toBeCloseTo(at60, 6)
  })

  it('respects the speed cap on long jumps', () => {
    const state = stepSpring({ value: 0, velocity: 0 }, 100, 0.1, { frequency: 20, maxSpeed: 3 })
    expect(state.value).toBeCloseTo(0.3)
    expect(state.velocity).toBe(3)
  })

  it('ignores zero or negative time steps', () => {
    const state = { value: 1, velocity: 2 }
    expect(stepSpring(state, 5, 0, { frequency: 6 })).toBe(state)
    expect(stepSpring(state, 5, -1, { frequency: 6 })).toBe(state)
  })

  it('never passes the target from rest (property)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1e3, max: 1e3, noNaN: true }),
        fc.double({ min: 1e-4, max: 0.5, noNaN: true }),
        fc.double({ min: 0.5, max: 30, noNaN: true }),
        (target, dt, frequency) => {
          const next = stepSpring({ value: 0, velocity: 0 }, target, dt, { frequency, maxSpeed: 5 })
          if (target >= 0) expect(next.value).toBeLessThanOrEqual(target + 1e-9)
          else expect(next.value).toBeGreaterThanOrEqual(target - 1e-9)
        },
      ),
    )
  })
})

describe('damp', () => {
  it('halves the distance every half-life', () => {
    expect(damp(0, 8, 0.5, 0.5)).toBeCloseTo(4)
    expect(damp(0, 8, 0.5, 1)).toBeCloseTo(6)
  })

  it('snaps with a zero half-life', () => {
    expect(damp(0, 8, 0, 0.016)).toBe(8)
    expect(dampFactor(0, 0.016)).toBe(1)
  })

  it('matches dampFactor', () => {
    expect(damp(2, 10, 0.3, 0.05)).toBeCloseTo(2 + 8 * dampFactor(0.3, 0.05))
  })
})
