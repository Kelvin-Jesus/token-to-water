import { Check, Monitor, Moon, Settings2, Share2, Sun } from 'lucide-react'
import type { RefObject } from 'react'
import { useI18n } from '@/i18n/useI18n'
import type { Locale, ThemePreference } from '@/types'
import { Button } from './ui/button'
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group'
import { Tooltip } from './ui/tooltip'

export type ShareStatus = 'idle' | 'copied' | 'failed'

export interface HeaderProps {
  readonly settingsButtonRef?: RefObject<HTMLButtonElement | null>
  /** Warm up the lazily loaded settings dialog before it is opened. */
  readonly onPrepareSettings?: () => void
  readonly theme: ThemePreference
  readonly onThemeChange: (theme: ThemePreference) => void
  readonly locale: Locale
  readonly onLocaleChange: (locale: Locale) => void
  readonly shareStatus: ShareStatus
  readonly onShare: () => void
  readonly onOpenSettings: () => void
}

const NEXT_THEME: Readonly<Record<ThemePreference, ThemePreference>> = { system: 'light', light: 'dark', dark: 'system' }
const THEME_ICONS = { system: Monitor, light: Sun, dark: Moon } as const

export function Logo() {
  return (
    <span aria-hidden className="grid size-8 place-items-center rounded-[0.625rem] bg-gradient-to-br from-sky-400 to-blue-600 shadow-sm">
      <svg viewBox="0 0 24 24" className="size-4.5 fill-white">
        <path d="M12 2.5c-.3 0-.6.14-.8.4C9.6 5 5 11 5 15a7 7 0 0 0 14 0c0-4-4.6-10-6.2-12.1a1 1 0 0 0-.8-.4Z" />
      </svg>
    </span>
  )
}

export function Header({
  theme,
  onThemeChange,
  locale,
  onLocaleChange,
  shareStatus,
  onShare,
  onOpenSettings,
  onPrepareSettings,
  settingsButtonRef,
}: HeaderProps) {
  const { t } = useI18n()
  const ThemeIcon = THEME_ICONS[theme]
  const themeLabel = t('header.theme', { theme: t(`theme.${theme}`) })
  const shareLabel = shareStatus === 'copied' ? t('header.shareCopied') : shareStatus === 'failed' ? t('header.shareFailed') : t('header.share')

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur-lg perf-low:bg-background perf-low:backdrop-blur-none">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:h-16 sm:px-6">
        <a
          href="./"
          className="flex min-h-10 min-w-0 items-center gap-2.5 rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 pointer-coarse:min-h-11"
        >
          <Logo />
          <span className="flex min-w-0 flex-col leading-tight">
            <span translate="no" className="truncate text-[0.9375rem] font-semibold tracking-tight">
              {t('app.name')}
            </span>
            <span className="hidden truncate text-xs text-muted-foreground sm:block">{t('app.tagline')}</span>
          </span>
        </a>

        <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
          <ToggleGroup
            type="single"
            aria-label={t('header.language')}
            value={locale}
            onValueChange={(value) => value && onLocaleChange(value as Locale)}
            className="hidden w-auto sm:inline-flex"
          >
            <ToggleGroupItem value="en" lang="en" aria-label="English" className="h-8 px-2.5 text-xs">
              EN
            </ToggleGroupItem>
            <ToggleGroupItem value="pt-BR" lang="pt-BR" aria-label="Português (Brasil)" className="h-8 px-2.5 text-xs">
              PT
            </ToggleGroupItem>
          </ToggleGroup>

          <Tooltip content={themeLabel}>
            <Button
              variant="ghost"
              size="icon"
              aria-label={themeLabel}
              onClick={() => onThemeChange(NEXT_THEME[theme])}
              className="hidden sm:inline-flex"
              data-testid="theme-toggle"
            >
              <ThemeIcon aria-hidden className="size-[1.125rem]" />
            </Button>
          </Tooltip>

          <Tooltip content={shareLabel}>
            <Button variant="ghost" size="icon" aria-label={shareLabel} onClick={onShare} data-testid="share-button">
              {shareStatus === 'copied' ? (
                <Check aria-hidden className="size-[1.125rem] text-primary" />
              ) : (
                <Share2 aria-hidden className="size-[1.125rem]" />
              )}
            </Button>
          </Tooltip>

          <Tooltip content={t('header.settings')}>
            <Button
              ref={settingsButtonRef}
              variant="outline"
              size="icon"
              aria-label={t('header.settings')}
              aria-haspopup="dialog"
              onClick={onOpenSettings}
              onPointerEnter={onPrepareSettings}
              onFocus={onPrepareSettings}
              data-testid="settings-button"
            >
              <Settings2 aria-hidden className="size-[1.125rem]" />
            </Button>
          </Tooltip>
        </div>
      </div>
    </header>
  )
}
