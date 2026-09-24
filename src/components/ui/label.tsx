import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export function Label({ className, ...props }: ComponentProps<'label'>) {
  // eslint-disable-next-line jsx-a11y/label-has-associated-control -- callers pass htmlFor or wrap the control.
  return <label data-slot="label" className={cn('text-sm font-medium leading-none select-none', className)} {...props} />
}
