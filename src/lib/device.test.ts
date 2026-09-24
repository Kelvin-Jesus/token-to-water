import { describe, expect, it } from 'vitest'
import { initialPerformanceTier, readDeviceHints } from './device'

describe('initialPerformanceTier', () => {
  it('defaults to high quality when nothing suggests otherwise', () => {
    expect(initialPerformanceTier({})).toEqual({ tier: 'high', reason: 'default' })
    expect(initialPerformanceTier({ hardwareConcurrency: 8, deviceMemory: 8 })).toEqual({ tier: 'high', reason: 'default' })
  })

  it('honours data saver first', () => {
    expect(initialPerformanceTier({ saveData: true, hardwareConcurrency: 16 })).toEqual({ tier: 'low', reason: 'save-data' })
  })

  it('starts weak machines in battery saver', () => {
    expect(initialPerformanceTier({ hardwareConcurrency: 4 })).toEqual({ tier: 'low', reason: 'hardware' })
    expect(initialPerformanceTier({ hardwareConcurrency: 8, deviceMemory: 2 })).toEqual({ tier: 'low', reason: 'hardware' })
  })

  it('ignores a zero core count (some privacy modes report 0)', () => {
    expect(initialPerformanceTier({ hardwareConcurrency: 0 }).tier).toBe('high')
  })
})

describe('readDeviceHints', () => {
  it('reads the Chromium-only hints when present', () => {
    const nav = { hardwareConcurrency: 6, deviceMemory: 4, connection: { saveData: true } } as unknown as Navigator
    expect(readDeviceHints(nav)).toEqual({ hardwareConcurrency: 6, deviceMemory: 4, saveData: true })
  })

  it('copes with a missing navigator', () => {
    expect(readDeviceHints(null)).toEqual({})
  })
})
