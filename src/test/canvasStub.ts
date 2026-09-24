/**
 * A recording CanvasRenderingContext2D for Node-only renderer tests. Every
 * method call is logged; property writes are kept so assertions can inspect
 * the final state. It does not rasterise — pixel output is verified in
 * Chromium by the Playwright suites.
 */
export interface RecordedCall {
  readonly method: string
  readonly args: readonly unknown[]
}

export function createCanvasStub(): { ctx: CanvasRenderingContext2D; calls: RecordedCall[]; count: (method: string) => number } {
  const calls: RecordedCall[] = []
  const state: Record<string | symbol, unknown> = {}
  const gradient = { addColorStop: () => {} }
  const special: Record<string, (...args: unknown[]) => unknown> = {
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    measureText: (text) => ({ width: String(text).length * 6 }),
  }
  const ctx = new Proxy(state, {
    get(target, property) {
      if (property in target) return target[property]
      if (typeof property !== 'string') return undefined
      return (...args: unknown[]) => {
        calls.push({ method: property, args })
        return special[property]?.(...args)
      }
    },
    set(target, property, value) {
      target[property] = value
      return true
    },
  }) as unknown as CanvasRenderingContext2D
  return { ctx, calls, count: (method) => calls.filter((call) => call.method === method).length }
}

/**
 * A do-nothing context for benchmarks: unlike the recording stub it allocates
 * nothing per call, so timings reflect the renderer's own JavaScript cost.
 */
export function createNoopCanvas(): CanvasRenderingContext2D {
  const noop = () => {}
  const gradient = { addColorStop: noop }
  const methods: Record<string, unknown> = {
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    measureText: (text: string) => ({ width: text.length * 6 }),
  }
  for (const name of ['setTransform', 'fillRect', 'beginPath', 'moveTo', 'lineTo', 'closePath', 'fill', 'stroke', 'arc', 'ellipse', 'quadraticCurveTo', 'save', 'restore', 'clip', 'fillText']) {
    methods[name] = noop
  }
  return methods as unknown as CanvasRenderingContext2D
}
