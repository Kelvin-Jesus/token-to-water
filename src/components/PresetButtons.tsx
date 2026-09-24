import { BookOpen, BrainCircuit, type LucideIcon, MessageSquare, MessagesSquare } from 'lucide-react'
import { PRESETS } from '@/constants/scales'
import { useI18n } from '@/i18n/useI18n'
import { cn } from '@/lib/utils'
import type { Preset } from '@/types'
import { formatCompact } from '@/utils/formatters'

const ICONS: Readonly<Record<Preset['id'], LucideIcon>> = {
  'short-query': MessageSquare,
  'extended-chat': MessagesSquare,
  'book-summary': BookOpen,
  'frontier-training': BrainCircuit,
}

export interface PresetButtonsProps {
  readonly tokens: number
  readonly onSelect: (tokens: number) => void
  readonly className?: string
}

/** Everyday-to-extreme starting points. Toggle buttons (aria-pressed) so the current match is announced. */
export function PresetButtons({ tokens, onSelect, className }: PresetButtonsProps) {
  const { locale, t } = useI18n()
  return (
    <fieldset className={cn('flex flex-col gap-2', className)}>
      <legend className="mb-2 text-sm font-medium">{t('presets.label')}</legend>
      <div className="grid grid-cols-2 gap-2">
        {PRESETS.map((preset) => {
          const Icon = ICONS[preset.id]
          const active = tokens === preset.tokens
          return (
            <button
              key={preset.id}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(preset.tokens)}
              data-testid={`preset-${preset.id}`}
              className={cn(
                'group flex min-h-16 items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-[border-color,background-color,box-shadow] duration-150',
                'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 touch-manipulation',
                active
                  ? 'border-primary/60 bg-primary/8 shadow-[inset_0_0_0_1px] shadow-primary/40'
                  : 'border-border bg-card hover:border-foreground/20 hover:bg-accent/60',
              )}
            >
              <Icon
                aria-hidden
                className={cn('mt-0.5 size-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')}
              />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[0.8125rem] leading-snug font-medium text-pretty">{t(`presets.${preset.id}`)}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatCompact(preset.tokens, locale, 'short')} {t('input.unit')}
                  {preset.id === 'frontier-training' ? (
                    <span translate="no" className="block leading-snug">
                      {t('presets.frontier-training.detail')}
                    </span>
                  ) : null}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
