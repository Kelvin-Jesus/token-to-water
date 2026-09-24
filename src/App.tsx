import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AboutSection } from '@/components/AboutSection'
import { EquivalenceReadout } from '@/components/EquivalenceReadout'
import { Header, type ShareStatus } from '@/components/Header'
import { PresetButtons } from '@/components/PresetButtons'
import { StatsGrid } from '@/components/StatsGrid'
import { TierLadder } from '@/components/TierLadder'
import { TokenInput } from '@/components/TokenInput'
import { Card, CardContent } from '@/components/ui/card'
import { WaterVisualizer } from '@/components/WaterVisualizer'
import { LITERS_PER_TOKEN, TIERS } from '@/constants/scales'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { usePerformanceTier } from '@/hooks/usePerformanceTier'
import { usePreferences } from '@/hooks/usePreferences'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useResolvedTheme } from '@/hooks/useResolvedTheme'
import { useShareableState } from '@/hooks/useShareableState'
import { formatEquivalence, translate } from '@/i18n/format'
import { I18nProvider } from '@/i18n/I18nProvider'
import { detectLocale } from '@/i18n/messages'
import { useI18n } from '@/i18n/useI18n'
import { resolveTier, tokensToLiters } from '@/lib/conversion'
import { describeEquivalence } from '@/lib/equivalence'
import type { Locale } from '@/types'
import { formatTokens, formatVolume } from '@/utils/formatters'

const SHARE_FEEDBACK_MS = 2200

// Settings (Radix Dialog, focus trap, scroll lock, switch) is a separate chunk: most visitors never
// open it, so it should not delay the first paint. It is preloaded on hover/focus of its button.
const loadSettings = () => import('@/components/SettingsDialog')
const SettingsDialog = lazy(() => loadSettings().then((module) => ({ default: module.SettingsDialog })))

export function App() {
  const [preferences, updatePreferences] = usePreferences()
  const [browserLocale] = useState<Locale>(() =>
    detectLocale(typeof navigator === 'undefined' ? [] : navigator.languages.length > 0 ? navigator.languages : [navigator.language]),
  )
  const locale = preferences.locale ?? browserLocale

  return (
    <I18nProvider locale={locale}>
      <AppContent locale={locale} preferences={preferences} updatePreferences={updatePreferences} />
    </I18nProvider>
  )
}

type PreferencesTuple = ReturnType<typeof usePreferences>

function AppContent({
  locale,
  preferences,
  updatePreferences,
}: {
  readonly locale: Locale
  readonly preferences: PreferencesTuple[0]
  readonly updatePreferences: PreferencesTuple[1]
}) {
  const { t } = useI18n()
  const { tokens, factor, setTokens, setFactor } = useShareableState()
  const theme = useResolvedTheme(preferences.theme)
  const reducedMotion = useReducedMotion(preferences.motion)
  const perf = usePerformanceTier(preferences.quality)
  const [settingsOpen, setSettingsOpen] = useState(false)
  // Mount the dialog only once it has been asked for; afterwards keep it mounted for its exit animation.
  const [settingsRequested, setSettingsRequested] = useState(false)
  const [shareStatus, setShareStatus] = useState<ShareStatus>('idle')
  const shareTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const settingsButtonRef = useRef<HTMLButtonElement>(null)
  const stageRef = useRef<HTMLElement>(null)

  const liters = tokensToLiters(tokens, factor)
  const position = resolveTier(liters)
  const equivalence = useMemo(() => describeEquivalence(liters), [liters])

  useEffect(() => {
    // CSS keys battery-saver styling (no backdrop blur, no shadows) off this attribute.
    document.documentElement.dataset.perf = perf.tier
    document.documentElement.dataset.motion = reducedMotion ? 'reduce' : 'full'
  }, [perf.tier, reducedMotion])

  useEffect(() => () => clearTimeout(shareTimer.current), [])

  const handleShare = useCallback(async () => {
    const url = window.location.href
    const { phrase } = formatEquivalence(equivalence, locale)
    const text = translate(locale, 'share.text', {
      tokens: formatTokens(tokens, locale),
      volume: formatVolume(liters, locale).text,
      icon: TIERS[position.index]!.icon,
      equivalence: phrase,
    })
    const flash = (status: ShareStatus) => {
      setShareStatus(status)
      clearTimeout(shareTimer.current)
      shareTimer.current = setTimeout(() => setShareStatus('idle'), SHARE_FEEDBACK_MS)
    }
    try {
      // The native share sheet is the better experience on phones; desktops get a copied link.
      if (typeof navigator.share === 'function' && window.matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ title: t('app.name'), text, url })
        return
      }
      await navigator.clipboard.writeText(url)
      flash('copied')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return // share sheet dismissed
      flash('failed')
    }
  }, [equivalence, liters, locale, position.index, t, tokens])

  // Screen readers hear one summary after input settles, not every intermediate slider value.
  const summary = useDebouncedValue(
    t('live.summary', {
      tokens: formatTokens(tokens, locale),
      volume: formatVolume(liters, locale).text,
      equivalence: formatEquivalence(equivalence, locale).sentence.replace(/\.$/, ''),
    }),
    700,
  )

  return (
    <div className="flex min-h-svh flex-col">
      <a
        href="#controls"
        className="sr-only z-50 rounded-lg bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {t('app.skip')}
      </a>

      <Header
        theme={preferences.theme}
        onThemeChange={(value) => updatePreferences({ theme: value })}
        locale={locale}
        onLocaleChange={(value) => updatePreferences({ locale: value })}
        shareStatus={shareStatus}
        onShare={() => void handleShare()}
        onOpenSettings={() => {
          setSettingsRequested(true)
          setSettingsOpen(true)
        }}
        onPrepareSettings={() => void loadSettings()}
        settingsButtonRef={settingsButtonRef}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-4 pb-12 sm:px-6 sm:pt-6">
        <h1 className="sr-only">
          {t('app.name')} — {t('app.tagline')}
        </h1>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(22rem,1fr)] lg:gap-6">
          <section ref={stageRef} aria-label={t('viz.region')} className="scroll-mt-20 lg:sticky lg:top-22 lg:self-start">
            <WaterVisualizer
              liters={liters}
              quality={perf.tier}
              reducedMotion={reducedMotion}
              theme={theme}
              onFrame={perf.reportFrame}
              onToggleMotion={() => updatePreferences({ motion: reducedMotion ? 'full' : 'reduce' })}
              className="h-[clamp(18rem,54svh,34rem)] lg:h-[calc(100svh-8rem)] lg:max-h-[54rem] lg:min-h-[32rem]"
            />
          </section>

          <div className="flex min-w-0 flex-col gap-4">
            <Card>
              <CardContent className="pt-5 sm:pt-6">
                <EquivalenceReadout
                  liters={liters}
                  tokens={tokens}
                  mlPerToken={LITERS_PER_TOKEN * factor * 1000}
                  position={position}
                  equivalence={equivalence}
                />
              </CardContent>
            </Card>

            <Card
              id="controls"
              tabIndex={-1}
              className="scroll-mt-24 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <CardContent className="flex flex-col gap-5 pt-5 sm:pt-6">
                <TokenInput tokens={tokens} onTokensChange={setTokens} />
                <PresetButtons tokens={tokens} onSelect={setTokens} />
              </CardContent>
            </Card>

            <StatsGrid liters={liters} />
          </div>
        </div>

        <TierLadder
          className="mt-8"
          position={position}
          factor={factor}
          reducedMotion={reducedMotion}
          onJump={(value) => {
            setTokens(value)
            // Picking a rung is a request to *see* it: on phones the stage is far above the ladder.
            const stage = stageRef.current
            if (stage && stage.getBoundingClientRect().bottom < 0) {
              stage.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' })
            }
          }}
        />

        <AboutSection className="mt-8" />
      </main>

      <footer className="border-t border-border/70 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <p className="mx-auto max-w-7xl px-4 text-xs text-muted-foreground sm:px-6">{t('footer.note')}</p>
      </footer>

      <p aria-live="polite" aria-atomic="true" className="sr-only" data-testid="live-summary">
        {summary}
      </p>

      {settingsRequested ? (
        <Suspense fallback={null}>
          <SettingsDialog
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
            returnFocusRef={settingsButtonRef}
            factor={factor}
            onFactorChange={setFactor}
            quality={preferences.quality}
            onQualityChange={(value) => updatePreferences({ quality: value })}
            activeTier={perf.tier}
            tierReason={perf.reason}
            motion={preferences.motion}
            reducedMotion={reducedMotion}
            onMotionChange={(value) => updatePreferences({ motion: value })}
            theme={preferences.theme}
            onThemeChange={(value) => updatePreferences({ theme: value })}
            locale={locale}
            onLocaleChange={(value) => updatePreferences({ locale: value })}
          />
        </Suspense>
      ) : null}
    </div>
  )
}
