import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_TOKENS, TOKEN_LIMITS } from '@/constants/scales'
import { useShareableState } from './useShareableState'

describe('useShareableState', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts from the defaults', () => {
    const { result } = renderHook(() => useShareableState())
    expect(result.current).toMatchObject({ tokens: DEFAULT_TOKENS, factor: 1 })
  })

  it('restores state from a shared link', () => {
    window.history.replaceState(null, '', '/?t=2500000000&f=0.5')
    const { result } = renderHook(() => useShareableState())
    expect(result.current).toMatchObject({ tokens: 2_500_000_000, factor: 0.5 })
  })

  it('clamps and rounds updates, ignoring non-finite values', () => {
    const { result } = renderHook(() => useShareableState())
    act(() => result.current.setTokens(-5))
    expect(result.current.tokens).toBe(0)
    act(() => result.current.setTokens(1e40))
    expect(result.current.tokens).toBe(TOKEN_LIMITS.max)
    act(() => result.current.setTokens(10.7))
    expect(result.current.tokens).toBe(11)
    act(() => result.current.setTokens(Number.NaN))
    expect(result.current.tokens).toBe(11)
    act(() => result.current.setFactor(99))
    expect(result.current.factor).toBe(10)
  })

  it('mirrors changes into the URL after a short debounce (replaceState, no history spam)', () => {
    vi.useFakeTimers()
    const push = vi.spyOn(window.history, 'pushState')
    const { result } = renderHook(() => useShareableState())
    act(() => result.current.setTokens(150))
    act(() => result.current.setTokens(10_000))
    expect(window.location.search).toBe('')
    act(() => vi.advanceTimersByTime(400))
    expect(window.location.search).toBe('?t=10000')
    expect(push).not.toHaveBeenCalled()
  })

  it('does not touch the URL on first render', () => {
    vi.useFakeTimers()
    const replace = vi.spyOn(window.history, 'replaceState')
    renderHook(() => useShareableState())
    act(() => vi.advanceTimersByTime(1000))
    expect(replace).not.toHaveBeenCalled()
  })
})
