import type { PerformanceTier } from '@/types'

export interface DeviceHints {
  readonly hardwareConcurrency?: number | undefined
  /** Chromium-only, in GiB, rounded and capped at 8. */
  readonly deviceMemory?: number | undefined
  /** User asked the browser to save data (Chromium `navigator.connection.saveData`). */
  readonly saveData?: boolean | undefined
}

export type TierReason = 'default' | 'hardware' | 'save-data' | 'fps' | 'user'

interface NavigatorWithHints extends Navigator {
  readonly deviceMemory?: number
  readonly connection?: { readonly saveData?: boolean }
}

/** Pass `null` to model an environment without `navigator` (workers, old runtimes). */
export function readDeviceHints(nav: Navigator | null = typeof navigator === 'undefined' ? null : navigator): DeviceHints {
  if (!nav) return {}
  const extended = nav as NavigatorWithHints
  return {
    hardwareConcurrency: nav.hardwareConcurrency,
    deviceMemory: extended.deviceMemory,
    saveData: extended.connection?.saveData,
  }
}

/**
 * Starting quality before any frame has been measured. Core count is a weak
 * signal both ways: budget phones ship 8 slow cores, while Safari caps what it
 * reports and a 4-core laptop or CI runner holds 60 FPS even under 4× CPU
 * throttling. So only clearly weak machines (≤ 2 cores or ≤ 2 GB) start in
 * battery saver; the FPS monitor catches the rest at runtime.
 */
export function initialPerformanceTier(hints: DeviceHints): { tier: PerformanceTier; reason: TierReason } {
  if (hints.saveData) return { tier: 'low', reason: 'save-data' }
  if (hints.hardwareConcurrency !== undefined && hints.hardwareConcurrency > 0 && hints.hardwareConcurrency <= 2) {
    return { tier: 'low', reason: 'hardware' }
  }
  if (hints.deviceMemory !== undefined && hints.deviceMemory <= 2) return { tier: 'low', reason: 'hardware' }
  return { tier: 'high', reason: 'default' }
}
