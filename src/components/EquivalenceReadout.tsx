import { TIERS } from '@/constants/scales'
import { formatEquivalence } from '@/i18n/format'
import { tierLabel } from '@/i18n/tierLabels'
import { useI18n } from '@/i18n/useI18n'
import { cn } from '@/lib/utils'
import type { Equivalence, TierPosition } from '@/types'
import { formatNumber, formatPercent, formatTokens, formatVolume } from '@/utils/formatters'
import { TIER_ICONS } from './tierIcons'

export interface EquivalenceReadoutProps {
  readonly liters: number
  readonly tokens: number
  /** Millilitres per token currently applied. */
  readonly mlPerToken: number
  readonly position: TierPosition
  readonly equivalence: Equivalence
  readonly className?: string
}

/** The numbers behind the picture: volume, a relatable comparison, and how full the current container is. */
export function EquivalenceReadout({ liters, tokens, mlPerToken, position, equivalence, className }: EquivalenceReadoutProps) {
  const { locale, t } = useI18n()
  const volume = formatVolume(liters, locale)
  const { sentence } = formatEquivalence(equivalence, locale)
  const tier = TIERS[position.index]!
  const label = tierLabel(tier.id, locale)
  const Icon = TIER_ICONS[tier.id]
  const beyondEarth = position.fill > 1

  return (
    <section aria-labelledby="readout-heading" className={cn('flex flex-col gap-4', className)}>
      <div className="flex flex-col gap-1">
        <h2 id="readout-heading" className="text-sm font-medium text-muted-foreground">
          {t('readout.heading')}
        </h2>
        <p className="flex items-baseline gap-2 font-semibold tracking-tight tabular-nums" data-testid="volume">
          <span className="text-5xl leading-none sm:text-6xl">{volume.value}</span>
          <span className="text-2xl text-muted-foreground sm:text-3xl">{volume.unit}</span>
        </p>
        <p className="mt-1 text-lg leading-snug font-medium text-balance sm:text-xl" data-testid="equivalence">
          {sentence}
        </p>
      </div>

      <div className="flex items-center gap-3 rounded-xl bg-muted/70 px-3 py-2.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-card text-primary shadow-xs">
          <Icon aria-hidden className="size-4.5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-2 text-[0.8125rem]">
            <span className="text-muted-foreground">{t('readout.current')}</span>
            {beyondEarth ? (
              <span className="font-medium text-primary">{t('readout.beyond')}</span>
            ) : null}
          </div>
          <p className="truncate text-sm font-medium" data-testid="fill-line">
            {t('readout.fill', { percent: formatPercent(Math.min(position.fill, 1), locale), of: label.of })}
          </p>
          <div aria-hidden className="h-1.5 overflow-hidden rounded-full bg-background">
            <div
              className="h-full origin-left rounded-full bg-gradient-to-r from-sky-400 to-primary transition-transform duration-500 ease-out"
              style={{ transform: `scaleX(${Math.min(position.fill, 1)})` }}
            />
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground tabular-nums">
        {t('readout.basis', { tokens: formatTokens(tokens, locale), rate: `${formatNumber(mlPerToken, locale)} mL` })}
      </p>
    </section>
  )
}
