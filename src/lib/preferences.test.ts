import { describe, expect, it } from 'vitest'
import { DEFAULT_PREFERENCES, loadPreferences, PREFERENCES_KEY, savePreferences } from './preferences'

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    data,
  }
}

describe('preferences', () => {
  it('falls back to defaults when nothing is stored or storage is unavailable', () => {
    expect(loadPreferences(memoryStorage())).toEqual(DEFAULT_PREFERENCES)
    expect(loadPreferences(undefined)).toEqual(DEFAULT_PREFERENCES)
  })

  it('round-trips a saved value', () => {
    const storage = memoryStorage()
    const preferences = { theme: 'dark', quality: 'low', motion: 'reduce', locale: 'pt-BR' } as const
    expect(savePreferences(storage, preferences)).toBe(true)
    expect(loadPreferences(storage)).toEqual(preferences)
  })

  it('validates each field on its own, keeping the valid ones', () => {
    const storage = memoryStorage({ [PREFERENCES_KEY]: JSON.stringify({ theme: 'dark', quality: 'ultra', motion: 7, locale: 'fr' }) })
    expect(loadPreferences(storage)).toEqual({ ...DEFAULT_PREFERENCES, theme: 'dark' })
  })

  it.each(['not json', 'null', '42', '"text"'])('survives corrupt storage: %s', (raw) => {
    expect(loadPreferences(memoryStorage({ [PREFERENCES_KEY]: raw }))).toEqual(DEFAULT_PREFERENCES)
  })

  it('survives storage that throws on access (blocked cookies, private mode)', () => {
    const throwing = {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    }
    expect(loadPreferences(throwing)).toEqual(DEFAULT_PREFERENCES)
    expect(savePreferences(throwing, DEFAULT_PREFERENCES)).toBe(false)
    expect(savePreferences(undefined, DEFAULT_PREFERENCES)).toBe(false)
  })
})
