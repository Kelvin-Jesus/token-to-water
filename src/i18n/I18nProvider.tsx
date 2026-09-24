import { type ReactNode, useLayoutEffect, useMemo } from 'react'
import type { Locale } from '@/types'
import { I18nContext, type I18nValue } from './context'
import { translate } from './format'

export function I18nProvider({ locale, children }: { readonly locale: Locale; readonly children: ReactNode }) {
  useLayoutEffect(() => {
    // Screen readers pick pronunciation from <html lang>; keep it in sync with the UI language.
    document.documentElement.lang = locale
  }, [locale])

  const value = useMemo<I18nValue>(() => ({ locale, t: (key, values) => translate(locale, key, values) }), [locale])
  return <I18nContext value={value}>{children}</I18nContext>
}
