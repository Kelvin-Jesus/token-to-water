import { useEffect, useState } from 'react'

/** Trails `value` by `delay` ms — e.g. so screen readers hear the result, not every slider step. */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}
