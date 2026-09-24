import type { MotionPreference } from '@/types'
import { useMediaQuery } from './useMediaQuery'

/** The OS setting wins unless the person chose explicitly in Settings. */
export function useReducedMotion(preference: MotionPreference): boolean {
  const systemPrefersReduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  if (preference === 'reduce') return true
  if (preference === 'full') return false
  return systemPrefersReduced
}
