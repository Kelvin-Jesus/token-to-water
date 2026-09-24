import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  [
    'inline-flex shrink-0 items-center justify-center gap-2 rounded-lg text-sm font-medium whitespace-nowrap select-none',
    'transition-[color,background-color,border-color,box-shadow,transform] duration-150 active:scale-[0.98]',
    'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
    'disabled:pointer-events-none disabled:opacity-50',
    "touch-manipulation [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        outline: 'border border-border bg-card shadow-xs hover:bg-accent hover:text-accent-foreground',
        ghost: 'text-foreground/80 hover:bg-accent hover:text-accent-foreground',
      },
      // Coarse pointers (touch) get 44 px targets, per WCAG 2.5.5 / Apple HIG.
      size: {
        default: 'h-10 px-4 pointer-coarse:h-11',
        sm: 'h-9 px-3 text-[0.8125rem] pointer-coarse:h-11',
        icon: 'size-10 pointer-coarse:size-11',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export type ButtonProps = ComponentProps<'button'> & VariantProps<typeof buttonVariants>

export function Button({ className, variant, size, type = 'button', ...props }: ButtonProps) {
  return <button data-slot="button" type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
