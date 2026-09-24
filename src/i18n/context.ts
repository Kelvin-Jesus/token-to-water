import { createContext } from 'react'
import type { Locale } from '@/types'
import type { MessageKey } from './messages'

export interface I18nValue {
  readonly locale: Locale
  readonly t: (key: MessageKey, values?: Readonly<Record<string, string | number>>) => string
}

export const I18nContext = createContext<I18nValue | null>(null)
