import { describe, expect, it } from 'vitest'
import { createCanvasStub } from '@/test/canvasStub'
import { ParticlePool } from './particles'

describe('ParticlePool', () => {
  it('spawns up to capacity and silently drops the rest', () => {
    const pool = new ParticlePool(3)
    for (let i = 0; i < 5; i++) pool.spawn(0, 0, 0, 0, 1, 1)
    expect(pool.count).toBe(3)
  })

  it('expires particles and keeps survivors packed', () => {
    const pool = new ParticlePool(4)
    pool.spawn(0, 0, 0, 0, 0.1, 1)
    pool.spawn(0, 0, 0, 0, 1, 1)
    pool.spawn(0, 0, 0, 0, 0.1, 1)
    pool.update(0.2, 0)
    expect(pool.count).toBe(1)
  })

  it('moves particles under gravity', () => {
    const pool = new ParticlePool(1)
    pool.spawn(0, 0, 10, 0, 5, 1)
    pool.update(1, 100)
    const { ctx, calls } = createCanvasStub()
    pool.draw(ctx, 'blue')
    const arc = calls.find((call) => call.method === 'arc')!
    expect(arc.args[0]).toBeCloseTo(10)
    expect(arc.args[1]).toBeCloseTo(100)
  })

  it('draws nothing when empty and can be cleared', () => {
    const pool = new ParticlePool(2)
    const { ctx, count } = createCanvasStub()
    pool.draw(ctx, 'blue')
    expect(count('arc')).toBe(0)
    pool.spawn(0, 0, 0, 0, 1, 1)
    pool.clear()
    expect(pool.count).toBe(0)
  })
})
