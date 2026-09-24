import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/** Segmented control (single choice), the pattern used for theme, language and quality. */
export function ToggleGroup({ className, ...props }: ComponentProps<typeof ToggleGroupPrimitive.Root>) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      className={cn('inline-flex w-full items-center gap-1 rounded-xl bg-muted p-1', className)}
      {...props}
    />
  )
}

export function ToggleGroupItem({ className, ...props }: ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      className={cn(
        'inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium whitespace-nowrap text-muted-foreground',
        'transition-[color,background-color,box-shadow] outline-none hover:text-foreground pointer-coarse:h-10',
        'focus-visible:ring-[3px] focus-visible:ring-ring/50',
        'data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-sm',
        "[&_svg]:size-4 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    />
  )
}
