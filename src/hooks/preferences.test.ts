import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PREFERENCES_KEY } from '@/lib/preferences'
import { setMediaQueries } from '@/test/setup'
import { useMediaQuery } from './useMediaQuery'
import { usePreferences } from './usePreferences'
import { useReducedMotion } from './useReducedMotion'
import { useResolvedTheme } from './useResolvedTheme'

describe('usePreferences', () => {
  it('persists changes to localStorage', () => {
    const { result } = renderHook(() => usePreferences())
    act(() => result.current[1]({ theme: 'dark' }))
    expect(result.current[0].theme).toBe('dark')
    expect(JSON.parse(localStorage.getItem(PREFERENCES_KEY)!)).toMatchObject({ theme: 'dark' })
  })

  it('loads previously saved preferences', () => {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ locale: 'pt-BR', quality: 'low' }))
    const { result } = renderHook(() => usePreferences())
    expect(result.current[0]).toMatchObject({ locale: 'pt-BR', quality: 'low', theme: 'system' })
  })
})

describe('useMediaQuery', () => {
  it('reads the current match', () => {
    setMediaQueries({ '(min-width: 1px)': true })
    expect(renderHook(() => useMediaQuery('(min-width: 1px)')).result.current).toBe(true)
    expect(renderHook(() => useMediaQuery('(max-width: 1px)')).result.current).toBe(false)
  })
})

describe('useReducedMotion', () => {
  it('follows the OS setting by default', () => {
    setMediaQueries({ '(prefers-reduced-motion: reduce)': true })
    expect(renderHook(() => useReducedMotion('system')).result.current).toBe(true)
  })

  it('lets the in-app switch override the OS either way', () => {
    setMediaQueries({ '(prefers-reduced-motion: reduce)': true })
    expect(renderHook(() => useReducedMotion('full')).result.current).toBe(false)
    setMediaQueries({ '(prefers-reduced-motion: reduce)': false })
    expect(renderHook(() => useReducedMotion('reduce')).result.current).toBe(true)
  })
})

describe('useResolvedTheme', () => {
  it('resolves "system" from the OS and applies it to <html>', () => {
    setMediaQueries({ '(prefers-color-scheme: dark)': true })
    const { result } = renderHook(() => useResolvedTheme('system'))
    expect(result.current).toBe('dark')
    expect(document.documentElement).toHaveClass('dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('applies an explicit choice', () => {
    setMediaQueries({ '(prefers-color-scheme: dark)': true })
    renderHook(() => useResolvedTheme('light'))
    expect(document.documentElement).not.toHaveClass('dark')
  })
})
