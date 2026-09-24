import { useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT_TOKENS, TOKEN_LIMITS, WATER_FACTOR } from '@/constants/scales'
import { clamp } from '@/lib/utils'
import { readShareState, type ShareState, writeShareState } from '@/lib/urlState'

const URL_WRITE_DELAY = 300

/**
 * Tokens and water factor, mirrored into the query string so any view can be
 * shared or bookmarked. Uses replaceState (debounced): dragging the slider must
 * not flood the history stack or the browser's URL-update rate limit.
 */
export function useShareableState() {
  const [state, setState] = useState<ShareState>(() => ({
    tokens: DEFAULT_TOKENS,
    factor: WATER_FACTOR.default,
    ...(typeof window === 'undefined' ? {} : readShareState(window.location.search)),
  }))
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    const timer = setTimeout(() => {
      const { pathname, search, hash } = window.location
      window.history.replaceState(window.history.state, '', `${pathname}${writeShareState(search, state)}${hash}`)
    }, URL_WRITE_DELAY)
    return () => clearTimeout(timer)
  }, [state])

  const setTokens = useCallback((tokens: number) => {
    if (!Number.isFinite(tokens)) return
    const next = clamp(Math.round(tokens), TOKEN_LIMITS.min, TOKEN_LIMITS.max)
    setState((current) => (current.tokens === next ? current : { ...current, tokens: next }))
  }, [])

  const setFactor = useCallback((factor: number) => {
    if (!Number.isFinite(factor)) return
    const next = clamp(factor, WATER_FACTOR.min, WATER_FACTOR.max)
    setState((current) => (current.factor === next ? current : { ...current, factor: next }))
  }, [])

  return { tokens: state.tokens, factor: state.factor, setTokens, setFactor }
}
