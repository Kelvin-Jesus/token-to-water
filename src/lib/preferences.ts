import { isLocale } from '@/i18n/messages'
import type { Locale, MotionPreference, QualityPreference, ThemePreference } from '@/types'

export interface Preferences {
  readonly theme: ThemePreference
  readonly quality: QualityPreference
  readonly motion: MotionPreference
  /** null = follow the browser language. */
  readonly locale: Locale | null
}

/** Versioned key: bump the suffix if the stored shape ever changes incompatibly. */
export const PREFERENCES_KEY = 'ttw:prefs:v1'

export const DEFAULT_PREFERENCES: Preferences = { theme: 'system', quality: 'auto', motion: 'system', locale: null }

const oneOf =
  <T extends string>(...values: readonly T[]) =>
  (value: unknown): value is T =>
    typeof value === 'string' && (values as readonly string[]).includes(value)

const isTheme = oneOf<ThemePreference>('system', 'light', 'dark')
const isQuality = oneOf<QualityPreference>('auto', 'high', 'low')
const isMotion = oneOf<MotionPreference>('system', 'reduce', 'full')

/**
 * Read preferences, validating every field independently: one corrupt value
 * (or storage blocked entirely, as in some private modes) must never take the
 * others down with it or crash the app.
 */
export function loadPreferences(storage: Pick<Storage, 'getItem'> | undefined): Preferences {
  let raw: unknown
  try {
    const text = storage?.getItem(PREFERENCES_KEY)
    raw = text ? JSON.parse(text) : null
  } catch {
    return DEFAULT_PREFERENCES
  }
  if (typeof raw !== 'object' || raw === null) return DEFAULT_PREFERENCES
  const record = raw as Record<string, unknown>
  return {
    theme: isTheme(record.theme) ? record.theme : DEFAULT_PREFERENCES.theme,
    quality: isQuality(record.quality) ? record.quality : DEFAULT_PREFERENCES.quality,
    motion: isMotion(record.motion) ? record.motion : DEFAULT_PREFERENCES.motion,
    locale: isLocale(record.locale) ? record.locale : null,
  }
}

/** Returns false when storage is unavailable or full; preferences then simply last for the session. */
export function savePreferences(storage: Pick<Storage, 'setItem'> | undefined, preferences: Preferences): boolean {
  try {
    storage?.setItem(PREFERENCES_KEY, JSON.stringify(preferences))
    return storage !== undefined
  } catch {
    return false
  }
}

export function safeLocalStorage(): Storage | undefined {
  try {
    return globalThis.localStorage
  } catch {
    // Accessing localStorage itself throws when cookies/site data are blocked.
    return undefined
  }
}
