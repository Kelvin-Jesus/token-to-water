/**
 * Canvas colours per theme. Kept in TypeScript (hex) rather than read from CSS
 * custom properties: canvas cannot resolve `var()`, older Safari rejects
 * `oklch()` in fillStyle, and the background needs numeric RGB to blend
 * continuously between "indoors", "sky" and "space" as the camera zooms out.
 */

export type Rgb = readonly [r: number, g: number, b: number]

export interface ScenePalette {
  readonly background: {
    readonly indoor: readonly [top: Rgb, bottom: Rgb]
    readonly sky: readonly [top: Rgb, bottom: Rgb]
    readonly space: readonly [top: Rgb, bottom: Rgb]
  }
  readonly ground: { readonly indoor: Rgb; readonly outdoor: Rgb }
  readonly groundLine: string
  readonly basin: string
  readonly basinLine: string
  readonly waterTop: string
  readonly waterMid: string
  readonly waterDeep: string
  readonly waterBack: string
  readonly waterSurface: string
  readonly foam: string
  readonly stroke: string
  readonly glass: string
  readonly highlight: string
  readonly label: string
  readonly labelOnDark: string
  readonly accent: string
  readonly lid: string
  readonly vehicle: string
  readonly vehicleDark: string
  readonly window: string
  readonly tire: string
  readonly hub: string
  readonly foliage: string
  readonly foliageDark: string
  readonly land: string
  readonly star: string
}

export function hexToRgb(hex: string): Rgb {
  const match = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex)
  if (!match) throw new Error(`invalid hex colour: ${hex}`)
  return [parseInt(match[1]!, 16), parseInt(match[2]!, 16), parseInt(match[3]!, 16)]
}

export function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

export function rgbToCss([r, g, b]: Rgb, alpha = 1): string {
  const channels = `${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}`
  return alpha >= 1 ? `rgb(${channels})` : `rgba(${channels}, ${alpha})`
}

/** Relative luminance (WCAG), used to pick legible label colours over the blended background. */
export function luminance([r, g, b]: Rgb): number {
  const channel = (value: number) => {
    const c = value / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

const SPACE: readonly [Rgb, Rgb] = [hexToRgb('#020617'), hexToRgb('#0b1633')]

export const PALETTES: Readonly<Record<'light' | 'dark', ScenePalette>> = {
  light: {
    background: {
      indoor: [hexToRgb('#f8fafc'), hexToRgb('#eef2f7')],
      sky: [hexToRgb('#dbeefe'), hexToRgb('#f1f8ff')],
      space: SPACE,
    },
    ground: { indoor: hexToRgb('#e2e8f0'), outdoor: hexToRgb('#d9cfbd') },
    groundLine: '#94a3b8',
    basin: '#c9bda7',
    basinLine: '#a8987c',
    waterTop: '#38bdf8',
    waterMid: '#0ea5e9',
    waterDeep: '#0369a1',
    waterBack: '#7dd3fc',
    waterSurface: '#e0f2fe',
    foam: '#f0f9ff',
    stroke: '#475569',
    glass: 'rgba(148, 163, 184, 0.14)',
    highlight: 'rgba(255, 255, 255, 0.65)',
    label: '#1e293b',
    labelOnDark: '#e2e8f0',
    accent: '#0284c7',
    lid: '#2563eb',
    vehicle: '#f97316',
    vehicleDark: '#334155',
    window: '#bae6fd',
    tire: '#1e293b',
    hub: '#94a3b8',
    foliage: '#16a34a',
    foliageDark: '#15803d',
    land: '#a3a38a',
    star: '#f8fafc',
  },
  dark: {
    background: {
      indoor: [hexToRgb('#0b1120'), hexToRgb('#0f172a')],
      sky: [hexToRgb('#0c1b33'), hexToRgb('#12233d')],
      space: SPACE,
    },
    ground: { indoor: hexToRgb('#1e293b'), outdoor: hexToRgb('#2a2a24') },
    groundLine: '#475569',
    basin: '#16161a',
    basinLine: '#3f3f46',
    waterTop: '#22d3ee',
    waterMid: '#0ea5e9',
    waterDeep: '#075985',
    waterBack: '#0e7490',
    waterSurface: '#a5f3fc',
    foam: '#ecfeff',
    stroke: '#94a3b8',
    glass: 'rgba(148, 163, 184, 0.10)',
    highlight: 'rgba(255, 255, 255, 0.35)',
    label: '#e2e8f0',
    labelOnDark: '#e2e8f0',
    accent: '#38bdf8',
    lid: '#3b82f6',
    vehicle: '#fb923c',
    vehicleDark: '#475569',
    window: '#7dd3fc',
    tire: '#020617',
    hub: '#64748b',
    foliage: '#22c55e',
    foliageDark: '#15803d',
    land: '#57534e',
    star: '#f8fafc',
  },
}
