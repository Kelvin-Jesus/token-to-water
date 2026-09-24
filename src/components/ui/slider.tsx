import * as SliderPrimitive from '@radix-ui/react-slider'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

interface SliderProps extends ComponentProps<typeof SliderPrimitive.Root> {
  /** Accessible name for the thumb (the element with role="slider"). */
  readonly thumbLabel: string
  /** Human-readable value announced instead of the raw step number, e.g. "1.5 million tokens". */
  readonly valueText?: string
  /** Id of help text for the thumb. (ARIA on the Root span would be ignored: it has no role.) */
  readonly describedBy?: string
}

export function Slider({ className, thumbLabel, valueText, describedBy, ...props }: SliderProps) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn(
        'relative flex w-full touch-none items-center select-none py-3 data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-muted">
        <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-sky-400 to-primary" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        aria-label={thumbLabel}
        aria-valuetext={valueText}
        aria-describedby={describedBy}
        className={cn(
          'block size-5 rounded-full border-2 border-primary bg-background shadow-sm pointer-coarse:size-7',
          'transition-[box-shadow,transform] outline-none hover:ring-4 hover:ring-ring/25',
          'focus-visible:ring-4 focus-visible:ring-ring/45 active:scale-110',
        )}
      />
    </SliderPrimitive.Root>
  )
}
