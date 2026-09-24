import { TOKEN_LIMITS, WATER_FACTOR } from '@/constants/scales'

export interface ShareState {
  readonly tokens: number
  readonly factor: number
}

const TOKENS_PARAM = 't'
const FACTOR_PARAM = 'f'
const PLAIN_NUMBER = /^\d+(?:\.\d+)?(?:e\+?\d+)?$/i

function parseParam(value: string | null): number | null {
  // A literal "+" in a query string decodes to a space, so a hand-written "1e+21" arrives as "1e 21".
  const text = value?.trim().replace(/e\s(?=\d)/i, 'e+') ?? null
  if (text === null || !PLAIN_NUMBER.test(text)) return null
  const number = Number(text)
  return Number.isFinite(number) ? number : null
}

/**
 * Read shareable state from a query string. Invalid or out-of-range values are
 * dropped (not clamped): a hand-edited link should fall back to defaults, not
 * silently show a different number than the one in the URL.
 */
export function readShareState(search: string): Partial<ShareState> {
  const params = new URLSearchParams(search)
  const state: { tokens?: number; factor?: number } = {}
  const tokens = parseParam(params.get(TOKENS_PARAM))
  if (tokens !== null && tokens >= TOKEN_LIMITS.min && tokens <= TOKEN_LIMITS.max) state.tokens = Math.round(tokens)
  const factor = parseParam(params.get(FACTOR_PARAM))
  if (factor !== null && factor >= WATER_FACTOR.min && factor <= WATER_FACTOR.max) state.factor = factor
  return state
}

/** Compact, human-readable encoding: `?t=500`, `?t=1.5e13&f=0.3`. Default factor is omitted. */
export function writeShareState(search: string, state: ShareState): string {
  const params = new URLSearchParams(search)
  params.set(TOKENS_PARAM, state.tokens >= 1e15 ? state.tokens.toExponential().replace('e+', 'e') : String(state.tokens))
  if (state.factor === WATER_FACTOR.default) params.delete(FACTOR_PARAM)
  else params.set(FACTOR_PARAM, String(Number(state.factor.toPrecision(3))))
  const query = params.toString()
  return query ? `?${query}` : ''
}
