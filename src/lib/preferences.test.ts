import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
// Vite's ?raw import: the real shipped HTML, without pulling Node types into the browser tsconfig.
import indexHtml from '../../index.html?raw'
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
  it('defaults to following the system, automatically', () => {
    expect(DEFAULT_PREFERENCES).toEqual({ theme: 'system', quality: 'auto', motion: 'system', locale: null })
  })

  it('uses the storage key that the no-flash theme script in index.html reads', () => {
    expect(PREFERENCES_KEY).toBe('ttw:prefs:v1')
    expect(indexHtml).toContain(`localStorage.getItem('${PREFERENCES_KEY}')`)
  })

  it('round-trips every valid combination (property)', () => {
    const preferences = fc.record({
      theme: fc.constantFrom('system', 'light', 'dark'),
      quality: fc.constantFrom('auto', 'high', 'low'),
      motion: fc.constantFrom('system', 'reduce', 'full'),
      locale: fc.constantFrom('en', 'pt-BR', null),
    } as const)
    fc.assert(
      fc.property(preferences, (value) => {
        const storage = memoryStorage()
        savePreferences(storage, value)
        expect(loadPreferences(storage)).toEqual(value)
      }),
    )
  })

  it('rejects non-string values even when they would stringify to a valid one', () => {
    const storage = memoryStorage({ [PREFERENCES_KEY]: JSON.stringify({ theme: ['dark'], quality: { toString: 'low' } }) })
    expect(loadPreferences(storage)).toEqual(DEFAULT_PREFERENCES)
  })

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
