import { Check } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { TIERS } from '@/constants/scales'
import { tierLabel } from '@/i18n/tierLabels'
import { useI18n } from '@/i18n/useI18n'
import { tokensToFillTier } from '@/lib/conversion'
import { cn } from '@/lib/utils'
import type { TierPosition } from '@/types'
import { formatVolume } from '@/utils/formatters'
import { TIER_ICONS } from './tierIcons'

export interface TierLadderProps {
  readonly position: TierPosition
  readonly factor: number
  readonly reducedMotion: boolean
  readonly onJump: (tokens: number) => void
  readonly className?: string
}

/**
 * All twenty rungs in order, as a horizontally scrolling rail. Doubles as
 * progress ("you are here") and as navigation: each rung fills exactly its
 * container, so people can explore the far end without typing 10²⁴.
 */
export function TierLadder({ position, factor, reducedMotion, onJump, className }: TierLadderProps) {
  const { locale, t } = useI18n()
  const listRef = useRef<HTMLOListElement>(null)

  useEffect(() => {
    // Keep the active rung in view. Scroll the rail itself — scrollIntoView would also scroll the page.
    const list = listRef.current
    const item = list?.children[position.index] as HTMLElement | undefined
    if (!list || !item) return
    const left = item.offsetLeft - list.clientWidth / 2 + item.clientWidth / 2
    if (typeof list.scrollTo === 'function') list.scrollTo({ left, behavior: reducedMotion ? 'auto' : 'smooth' })
  }, [position.index, reducedMotion])

  return (
    <section aria-labelledby="ladder-heading" className={cn('flex flex-col gap-3', className)}>
      <div className="flex flex-col gap-1 px-1">
        <h2 id="ladder-heading" className="text-base font-semibold tracking-tight">
          {t('ladder.heading')}
        </h2>
        <p className="text-sm text-muted-foreground text-pretty">{t('ladder.description')}</p>
      </div>
      <ol
        ref={listRef}
        className="ladder-rail -mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-px-4 px-4 pt-1 pb-3 sm:-mx-6 sm:scroll-px-6 sm:px-6"
      >
        {TIERS.map((tier, index) => {
          const label = tierLabel(tier.id, locale)
          const Icon = TIER_ICONS[tier.id]
          const volume = formatVolume(tier.volumeLiters, locale).text
          const jumpTokens = tokensToFillTier(index, factor)
          const done = index < position.index
          const active = index === position.index
          const status = done ? t('ladder.status.done') : active ? t('ladder.status.active') : null
          const name =
            jumpTokens === null
              ? t('ladder.unreachable', { tier: label.title, volume })
              : `${t('ladder.jump', { tier: label.title, volume })}${status ? `, ${status}` : ''}`
          return (
            <li key={tier.id} className="snap-start">
              <button
                type="button"
                disabled={jumpTokens === null}
                aria-label={name}
                aria-current={active ? 'step' : undefined}
                title={label.description}
                onClick={() => jumpTokens !== null && onJump(jumpTokens)}
                data-testid={`tier-${tier.id}`}
                className={cn(
                  'relative flex h-full w-36 flex-col gap-2 rounded-2xl border p-3 text-left transition-[border-color,background-color,box-shadow] duration-150',
                  'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 touch-manipulation disabled:cursor-default',
                  active
                    ? 'border-primary/60 bg-primary/8 shadow-[inset_0_0_0_1px] shadow-primary/40'
                    : 'border-border bg-card enabled:hover:border-foreground/20 enabled:hover:bg-accent/60',
                )}
              >
                <span className="flex items-center justify-between">
                  <span
                    className={cn(
                      'grid size-9 place-items-center rounded-xl',
                      done ? 'bg-primary text-primary-foreground' : active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    <Icon aria-hidden className="size-4.5" />
                  </span>
                  <span className="text-[0.6875rem] font-medium text-muted-foreground tabular-nums">
                    {done ? <Check aria-hidden className="size-4 text-primary" /> : `${index + 1}`}
                  </span>
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="line-clamp-2 min-h-10 text-[0.8125rem] leading-tight font-medium">{label.title}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{volume}</span>
                </span>
                {active ? (
                  <span aria-hidden className="h-1 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full origin-left rounded-full bg-primary transition-transform duration-500"
                      style={{ transform: `scaleX(${Math.min(1, position.fill)})` }}
                    />
                  </span>
                ) : null}
              </button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
