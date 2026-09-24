import { useCallback, useState } from 'react'
import { loadPreferences, type Preferences, safeLocalStorage, savePreferences } from '@/lib/preferences'

export function usePreferences(): readonly [Preferences, (patch: Partial<Preferences>) => void] {
  const [preferences, setPreferences] = useState(() => loadPreferences(safeLocalStorage()))

  const update = useCallback((patch: Partial<Preferences>) => {
    setPreferences((current) => {
      const next = { ...current, ...patch }
      savePreferences(safeLocalStorage(), next)
      return next
    })
  }, [])

  return [preferences, update] as const
}
