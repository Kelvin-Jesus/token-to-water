import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { I18nProvider } from '@/i18n/I18nProvider'
import type { Locale } from '@/types'

/** Render inside the providers every component expects (i18n). */
export function renderWithProviders(ui: ReactElement, { locale = 'en', ...options }: RenderOptions & { locale?: Locale } = {}) {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <I18nProvider locale={locale}>{children}</I18nProvider>
  )
  return render(ui, { wrapper: Wrapper, ...options })
}
