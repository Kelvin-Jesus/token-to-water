import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { type DeviceHints, initialPerformanceTier, readDeviceHints, type TierReason } from '@/lib/device'
import { FpsMonitor } from '@/lib/fpsMonitor'
import type { PerformanceTier, QualityPreference } from '@/types'

export interface PerformanceTierState {
  readonly tier: PerformanceTier
  readonly reason: TierReason
  /**
   * Feed rAF timestamps from the render loop (only while it runs at full
   * rate). Stable identity, safe to call every frame.
   */
  readonly reportFrame: (now: number) => void
}

/**
 * Chooses between high quality and battery saver.
 *
 * Starts from cheap device hints (core count, memory, data saver), then
 * watches the real frame rate: two consecutive one-second windows under
 * 45 FPS switch to battery saver for the rest of the session. An explicit
 * choice in Settings always wins.
 */
export function usePerformanceTier(preference: QualityPreference, hints?: DeviceHints): PerformanceTierState {
  const [initial] = useState(() => initialPerformanceTier(hints ?? readDeviceHints()))
  const [downgraded, setDowngraded] = useState(false)
  const monitorRef = useRef<FpsMonitor | null>(null)
  const shouldMonitor = preference === 'auto' && initial.tier === 'high' && !downgraded
  const shouldMonitorRef = useRef(shouldMonitor)
  useLayoutEffect(() => {
    shouldMonitorRef.current = shouldMonitor
  }, [shouldMonitor])

  const reportFrame = useCallback((now: number) => {
    if (!shouldMonitorRef.current) return
    monitorRef.current ??= new FpsMonitor()
    if (monitorRef.current.sample(now)) setDowngraded(true)
  }, [])

  return useMemo(() => {
    if (preference !== 'auto') return { tier: preference, reason: 'user', reportFrame }
    if (downgraded) return { tier: 'low', reason: 'fps', reportFrame }
    return { tier: initial.tier, reason: initial.reason, reportFrame }
  }, [preference, downgraded, initial, reportFrame])
}
