import { useLayoutEffect } from 'react'
import type { ThemePreference } from '@/types'
import { useMediaQuery } from './useMediaQuery'

const THEME_COLORS = { light: '#f8fafc', dark: '#0b1120' } as const

/**
 * Resolve "system" against the OS and apply the result to <html>. Runs in a
 * layout effect so the class flips before paint (the inline script in
 * index.html already handled the very first paint).
 */
export function useResolvedTheme(preference: ThemePreference): 'light' | 'dark' {
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)')
  const resolved = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference

  useLayoutEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', resolved === 'dark')
    root.style.colorScheme = resolved
    document.querySelector('meta[name="theme-color"]:not([media])')?.setAttribute('content', THEME_COLORS[resolved])
  }, [resolved])

  return resolved
}
