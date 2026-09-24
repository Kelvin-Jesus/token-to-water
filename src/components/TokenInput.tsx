import { type ChangeEvent, type KeyboardEvent, useId, useLayoutEffect, useRef, useState } from 'react'
import { TOKEN_LIMITS } from '@/constants/scales'
import { useI18n } from '@/i18n/useI18n'
import { SLIDER_STEPS, sliderValueToTokens, tokensToSliderValue } from '@/lib/logScale'
import { formatDigitsWithCaret, parseTokenInput, type TokenParseError } from '@/lib/parseTokens'
import { cn } from '@/lib/utils'
import { formatCompact, formatCompactCount, formatPowerOfTen, formatTokens } from '@/utils/formatters'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Slider } from './ui/slider'

export interface TokenInputProps {
  readonly tokens: number
  readonly onTokensChange: (tokens: number) => void
  readonly className?: string
}

const DECADES = Math.log10(TOKEN_LIMITS.max)
/** Slider tick marks every three decades; the exotic ones hide on narrow screens. */
const TICKS = [
  { exponent: 0, compact: true },
  { exponent: 3, compact: true },
  { exponent: 6, compact: true },
  { exponent: 9, compact: true },
  { exponent: 12, compact: true },
  { exponent: 15, compact: false },
  { exponent: 18, compact: true },
  { exponent: 21, compact: false },
  { exponent: 24, compact: true },
] as const

/**
 * Two synchronised controls for one number:
 * - a text field with live digit grouping and shorthand ("2.5k", "15T"),
 * - a logarithmic slider spanning 1 → 10²⁵ tokens.
 */
export function TokenInput({ tokens, onTokensChange, className }: TokenInputProps) {
  const { locale, t } = useI18n()
  const inputId = useId()
  const messageId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const pendingCaret = useRef<number | null>(null)
  // `draft` holds the raw text while the field is being edited; null means "show the canonical value".
  const [draft, setDraft] = useState<string | null>(null)
  const [error, setError] = useState<TokenParseError | null>(null)
  // The thumb keeps its own position: near 1 token several steps round to the same integer, and
  // re-deriving the position from `tokens` would pin the thumb (keyboard users could never leave the left end).
  const [slider, setSlider] = useState(() => ({ position: tokensToSliderValue(tokens), tokens }))
  if (slider.tokens !== tokens) {
    // Tokens changed from outside (typing, presets, ladder): move the thumb to match.
    setSlider({ position: tokensToSliderValue(tokens), tokens })
  }

  useLayoutEffect(() => {
    // Re-grouping digits moves text under the caret; restore it next to the same digit.
    if (pendingCaret.current !== null && inputRef.current && document.activeElement === inputRef.current) {
      inputRef.current.setSelectionRange(pendingCaret.current, pendingCaret.current)
    }
    pendingCaret.current = null
  })

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value
    const formatted = formatDigitsWithCaret(raw, event.target.selectionStart ?? raw.length, locale)
    const text = formatted?.text ?? raw
    pendingCaret.current = formatted?.caret ?? null
    setDraft(text)

    const result = parseTokenInput(text, locale)
    if (result.ok) {
      setError(null)
      onTokensChange(result.value)
    } else {
      // An empty field mid-edit is not an error yet — the person is probably about to type.
      setError(result.error === 'empty' ? null : result.error)
    }
  }

  const commit = () => {
    if (draft === null) return
    const result = parseTokenInput(draft, locale)
    if (result.ok) {
      onTokensChange(result.value)
      setDraft(null)
      setError(null)
    } else if (result.error === 'empty') {
      setDraft(null)
      setError(null)
    }
    // Invalid text stays visible with its error so it can be corrected rather than silently discarded.
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      commit()
    } else if (event.key === 'Escape' && draft !== null) {
      event.preventDefault()
      setDraft(null)
      setError(null)
    }
  }

  const value = draft ?? formatTokens(tokens, locale)
  const longReading = formatCompactCount(tokens, locale)
  const helper = error
    ? t(`input.error.${error}`)
    : tokens >= 1e6 || (draft !== null && /[a-z]/i.test(draft))
      ? t('input.reading', { value: longReading })
      : t('input.help')

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex flex-col gap-2">
        <Label htmlFor={inputId}>{t('input.label')}</Label>
        <div className="relative">
          <Input
            ref={inputRef}
            id={inputId}
            name="tokens"
            inputMode="decimal"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="done"
            value={value}
            onChange={handleChange}
            onBlur={commit}
            onKeyDown={handleKeyDown}
            onFocus={(event) => event.currentTarget.select()}
            aria-invalid={error !== null}
            aria-describedby={messageId}
            data-testid="token-input"
            className="pr-20 text-lg font-semibold tabular-nums sm:text-xl"
          />
          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-muted-foreground">
            {t('input.unit')}
          </span>
        </div>
        <p
          id={messageId}
          aria-live="polite"
          className={cn('min-h-5 text-[0.8125rem]', error ? 'font-medium text-destructive' : 'text-muted-foreground')}
        >
          {helper}
        </p>
      </div>

      <div>
        <Slider
          min={0}
          max={SLIDER_STEPS}
          step={1}
          value={[slider.position]}
          onValueChange={([position]) => {
            if (position === undefined) return
            const next = sliderValueToTokens(position)
            setSlider({ position, tokens: next })
            setDraft(null)
            setError(null)
            onTokensChange(next)
          }}
          thumbLabel={t('slider.label')}
          valueText={t('slider.value', { value: longReading })}
          data-testid="token-slider"
        />
        <div aria-hidden className="relative mx-2.5 h-4 text-[0.6875rem] text-muted-foreground tabular-nums">
          {TICKS.map(({ exponent, compact }) => (
            <span
              key={exponent}
              className={cn('absolute top-0 -translate-x-1/2 whitespace-nowrap', !compact && 'hidden sm:inline')}
              style={{ left: `${(exponent / DECADES) * 100}%` }}
            >
              {exponent <= 12 ? formatCompact(10 ** exponent, locale, 'short') : formatPowerOfTen(exponent)}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
