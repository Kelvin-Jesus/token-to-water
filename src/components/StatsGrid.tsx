import { GlassWater, Weight } from 'lucide-react'
import { DRINKING_WATER_LITERS_PER_DAY } from '@/constants/scales'
import { useI18n } from '@/i18n/useI18n'
import { cn } from '@/lib/utils'
import { formatDuration, formatMass } from '@/utils/formatters'

/** Two more ways to feel the number: its weight, and how long one person could drink it. */
export function StatsGrid({ liters, className }: { readonly liters: number; readonly className?: string }) {
  const { locale, t } = useI18n()
  const mass = formatMass(liters, locale)
  const drinking = formatDuration(liters / DRINKING_WATER_LITERS_PER_DAY, locale)

  return (
    <section aria-labelledby="stats-heading" className={cn('flex flex-col gap-3', className)}>
      <h2 id="stats-heading" className="text-sm font-medium text-muted-foreground">
        {t('stats.heading')}
      </h2>
      <dl className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
        <div className="flex flex-col gap-1 rounded-2xl border border-border bg-card p-4">
          <dt className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground">
            <Weight aria-hidden className="size-4" />
            {t('stats.mass')}
          </dt>
          <dd className="text-xl font-semibold tabular-nums" data-testid="stat-mass">
            {mass.text}
          </dd>
        </div>
        <div className="flex flex-col gap-1 rounded-2xl border border-border bg-card p-4">
          <dt className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground">
            <GlassWater aria-hidden className="size-4" />
            {t('stats.drinking')}
          </dt>
          <dd className="min-h-[2lh] text-xl font-semibold text-balance tabular-nums" data-testid="stat-drinking">
            {drinking ?? t('stats.drinkingBeyond')}
          </dd>
          <dd className="text-xs text-muted-foreground">{t('stats.drinkingNote')}</dd>
        </div>
      </dl>
    </section>
  )
}
