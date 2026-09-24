import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { QualityPreference } from '@/types'
import { usePerformanceTier } from './usePerformanceTier'

const FAST_DEVICE = { hardwareConcurrency: 8, deviceMemory: 8 }

/** Feed rAF timestamps at a fixed FPS through the hook's reportFrame. */
function feed(report: (now: number) => void, fps: number, seconds: number, start = 0) {
  act(() => {
    for (let i = 0; i <= fps * seconds; i++) report(start + (i * 1000) / fps)
  })
}

describe('usePerformanceTier', () => {
  it('starts in high quality on a capable device', () => {
    const { result } = renderHook(() => usePerformanceTier('auto', FAST_DEVICE))
    expect(result.current).toMatchObject({ tier: 'high', reason: 'default' })
  })

  it('starts in battery saver on a weak device', () => {
    const { result } = renderHook(() => usePerformanceTier('auto', { hardwareConcurrency: 2 }))
    expect(result.current).toMatchObject({ tier: 'low', reason: 'hardware' })
  })

  it('drops to battery saver when the frame rate stays below 45 FPS', () => {
    const { result } = renderHook(() => usePerformanceTier('auto', FAST_DEVICE))
    feed(result.current.reportFrame, 30, 5)
    expect(result.current).toMatchObject({ tier: 'low', reason: 'fps' })
  })

  it('stays in high quality at a steady 60 FPS', () => {
    const { result } = renderHook(() => usePerformanceTier('auto', FAST_DEVICE))
    feed(result.current.reportFrame, 60, 5)
    expect(result.current.tier).toBe('high')
  })

  it('lets an explicit choice override detection', () => {
    const { result, rerender } = renderHook(({ preference }) => usePerformanceTier(preference, FAST_DEVICE), {
      initialProps: { preference: 'low' as QualityPreference },
    })
    expect(result.current).toMatchObject({ tier: 'low', reason: 'user' })
    rerender({ preference: 'high' })
    feed(result.current.reportFrame, 20, 5)
    expect(result.current).toMatchObject({ tier: 'high', reason: 'user' })
  })

  it('keeps reportFrame stable across renders (safe to hand to the render loop)', () => {
    const { result, rerender } = renderHook(({ preference }) => usePerformanceTier(preference, FAST_DEVICE), {
      initialProps: { preference: 'auto' as QualityPreference },
    })
    const first = result.current.reportFrame
    rerender({ preference: 'high' })
    expect(result.current.reportFrame).toBe(first)
  })
})
