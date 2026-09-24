import { Languages, Monitor, Moon, RotateCcw, Sun } from 'lucide-react'
import { type ReactNode, type RefObject, useId } from 'react'
import { LITERS_PER_TOKEN, WATER_FACTOR } from '@/constants/scales'
import { LOCALES } from '@/i18n/messages'
import { useI18n } from '@/i18n/useI18n'
import type { TierReason } from '@/lib/device'
import { fromLogPosition, toLogPosition } from '@/lib/logScale'
import type { Locale, MotionPreference, PerformanceTier, QualityPreference, ThemePreference } from '@/types'
import { formatNumber } from '@/utils/formatters'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { Label } from './ui/label'
import { Slider } from './ui/slider'
import { Switch } from './ui/switch'
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group'

const FACTOR_STEPS = 200

export interface SettingsDialogProps {
  readonly open: boolean
  /**
   * Where focus goes when the dialog closes. Radix only restores focus to its own
   * `Dialog.Trigger`; the trigger here lives in the header, outside this lazily loaded chunk.
   */
  readonly returnFocusRef?: RefObject<HTMLElement | null>
  readonly onOpenChange: (open: boolean) => void
  readonly factor: number
  readonly onFactorChange: (factor: number) => void
  readonly quality: QualityPreference
  readonly onQualityChange: (quality: QualityPreference) => void
  readonly activeTier: PerformanceTier
  readonly tierReason: TierReason
  readonly motion: MotionPreference
  readonly reducedMotion: boolean
  readonly onMotionChange: (motion: MotionPreference) => void
  readonly theme: ThemePreference
  readonly onThemeChange: (theme: ThemePreference) => void
  readonly locale: Locale
  readonly onLocaleChange: (locale: Locale) => void
}

const LOCALE_NAMES: Readonly<Record<Locale, string>> = { en: 'English', 'pt-BR': 'Português (Brasil)' }

function SettingRow({ children }: { readonly children: ReactNode }) {
  return <div className="flex flex-col gap-3 border-t border-border pt-5 first:border-t-0 first:pt-0">{children}</div>
}

export function SettingsDialog(props: SettingsDialogProps) {
  const { t } = useI18n()
  const { locale } = props
  const factorId = useId()
  const motionId = useId()
  const factorHelpId = useId()
  const toMl = (factor: number) => `${formatNumber(LITERS_PER_TOKEN * factor * 1000, locale)} mL`
  const current = toMl(props.factor)
  const defaultRate = toMl(WATER_FACTOR.default)
  const reasonKey = props.tierReason === 'fps' || props.tierReason === 'hardware' || props.tierReason === 'save-data' ? props.tierReason : null

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent
        closeLabel={t('settings.close')}
        data-testid="settings-dialog"
        onCloseAutoFocus={(event) => {
          if (!props.returnFocusRef?.current) return
          event.preventDefault()
          props.returnFocusRef.current.focus()
        }}
      >
        <DialogHeader>
          <DialogTitle>{t('settings.title')}</DialogTitle>
          <DialogDescription>{t('settings.description')}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <SettingRow>
            <div className="flex items-baseline justify-between gap-3">
              <span id={factorId} className="text-sm font-medium">{t('settings.factor')}</span>
              <output className="text-sm font-semibold tabular-nums" data-testid="factor-value">
                {t('settings.factorValue', { value: current })}
              </output>
            </div>
            <Slider
              describedBy={factorHelpId}
              min={0}
              max={FACTOR_STEPS}
              step={1}
              value={[Math.round(toLogPosition(props.factor, WATER_FACTOR.min, WATER_FACTOR.max) * FACTOR_STEPS)]}
              onValueChange={([position]) => {
                if (position === undefined) return
                const raw = fromLogPosition(position / FACTOR_STEPS, WATER_FACTOR.min, WATER_FACTOR.max)
                props.onFactorChange(Number(raw.toPrecision(2)))
              }}
              thumbLabel={t('settings.factor')}
              valueText={t('settings.factorValue', { value: current })}
              data-testid="factor-slider"
            />
            <div className="flex items-start justify-between gap-3">
              <p id={factorHelpId} className="text-[0.8125rem] text-muted-foreground text-pretty">
                {t('settings.factorHelp', { value: defaultRate })}
              </p>
              <Button
                variant="outline"
                size="sm"
                disabled={props.factor === WATER_FACTOR.default}
                onClick={() => props.onFactorChange(WATER_FACTOR.default)}
              >
                <RotateCcw aria-hidden />
                {t('settings.factorReset', { value: defaultRate })}
              </Button>
            </div>
          </SettingRow>

          <SettingRow>
            <span id={`${factorId}-quality`} className="text-sm font-medium">
              {t('settings.quality')}
            </span>
            <ToggleGroup
              type="single"
              aria-labelledby={`${factorId}-quality`}
              value={props.quality}
              onValueChange={(value) => value && props.onQualityChange(value as QualityPreference)}
            >
              <ToggleGroupItem value="auto">{t('settings.quality.auto')}</ToggleGroupItem>
              <ToggleGroupItem value="high">{t('settings.quality.high')}</ToggleGroupItem>
              <ToggleGroupItem value="low">{t('settings.quality.low')}</ToggleGroupItem>
            </ToggleGroup>
            <p className="text-[0.8125rem] text-muted-foreground" data-testid="quality-status">
              {t(`settings.qualityStatus.${props.activeTier}`)}
              {props.quality === 'auto' && reasonKey ? ` ${t(`settings.qualityReason.${reasonKey}`)}` : ''}
            </p>
          </SettingRow>

          <SettingRow>
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <Label htmlFor={motionId}>{t('settings.motion')}</Label>
                <p className="text-[0.8125rem] text-muted-foreground">{t('settings.motionHelp')}</p>
              </div>
              <Switch
                id={motionId}
                checked={props.reducedMotion}
                onCheckedChange={(checked) => props.onMotionChange(checked ? 'reduce' : 'full')}
              />
            </div>
          </SettingRow>

          <SettingRow>
            <span id={`${factorId}-theme`} className="text-sm font-medium">
              {t('settings.theme')}
            </span>
            <ToggleGroup
              type="single"
              aria-labelledby={`${factorId}-theme`}
              value={props.theme}
              onValueChange={(value) => value && props.onThemeChange(value as ThemePreference)}
            >
              <ToggleGroupItem value="system">
                <Monitor aria-hidden />
                {t('theme.system')}
              </ToggleGroupItem>
              <ToggleGroupItem value="light">
                <Sun aria-hidden />
                {t('theme.light')}
              </ToggleGroupItem>
              <ToggleGroupItem value="dark">
                <Moon aria-hidden />
                {t('theme.dark')}
              </ToggleGroupItem>
            </ToggleGroup>
          </SettingRow>

          <SettingRow>
            <span id={`${factorId}-language`} className="flex items-center gap-2 text-sm font-medium">
              <Languages aria-hidden className="size-4" />
              {t('settings.language')}
            </span>
            <ToggleGroup
              type="single"
              aria-labelledby={`${factorId}-language`}
              value={locale}
              onValueChange={(value) => value && props.onLocaleChange(value as Locale)}
            >
              {LOCALES.map((option) => (
                <ToggleGroupItem key={option} value={option} lang={option}>
                  {LOCALE_NAMES[option]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </SettingRow>
        </div>
      </DialogContent>
    </Dialog>
  )
}
