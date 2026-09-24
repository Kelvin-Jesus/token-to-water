import { cloneElement, type ReactElement } from 'react'

/**
 * Hover/focus hint for icon-only controls, in pure CSS (see `.tooltip` in
 * index.css). Supplementary only: every trigger also carries an aria-label, so
 * the hint is hidden from assistive tech and never shown on touch screens.
 *
 * A positioning engine (Radix Tooltip + floating-ui) would cost ~15 KB gzip —
 * a poor trade for a one-line label under a header button.
 */
export function Tooltip({ content, children }: { readonly content: string; readonly children: ReactElement<{ 'data-tooltip'?: string }> }) {
  return cloneElement(children, { 'data-tooltip': content })
}
