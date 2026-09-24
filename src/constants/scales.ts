import type { Preset, Tier } from '@/types'

/**
 * Reference cooling + electricity water cost of processing one token.
 *
 * 1 token ≈ 1 mL, so an average 500-token prompt ≈ a 500 mL bottle. Published
 * estimates vary by orders of magnitude (model size, data-centre cooling,
 * climate, season, energy mix), so this is a deliberately round reference —
 * the UI lets people scale it with `WATER_FACTOR`.
 */
export const LITERS_PER_TOKEN = 0.001

/** Multiplier applied to `LITERS_PER_TOKEN` from the "water per token" setting. */
export const WATER_FACTOR = { min: 0.1, max: 10, default: 1 } as const

/**
 * Token range reachable from the UI. The top end is far beyond "trillions" on
 * purpose: ~1.4 × 10²⁴ tokens are needed to fill the last tier (all water on
 * Earth) at the default rate, and the ladder must be explorable end to end.
 */
export const TOKEN_LIMITS = { min: 0, max: 1e25 } as const

/** 500 tokens = exactly one small water bottle, the headline comparison. */
export const DEFAULT_TOKENS = 500

/** Rough adult drinking-water need, used for the "days of drinking water" stat. */
export const DRINKING_WATER_LITERS_PER_DAY = 2

/**
 * The 20-rung volume ladder, strictly increasing.
 *
 * Tiers 18 and 19 deliberately differ from the original brief, which listed
 * the Mediterranean at 3.75 × 10¹⁵ L and the Atlantic at 3.1 × 10¹⁷ L. Those
 * are the published volumes in *cubic metres*, not litres (3.75 million km³ and
 * 310 million km³). See docs/adr/0001-ocean-volumes.md.
 */
export const TIERS = [
  {
    id: 'drop',
    name: 'Water Drop',
    volumeLiters: 0.00005,
    icon: '💧',
    description: 'About 0.05 mL. One token at the default rate is roughly 20 drops.',
    countable: true,
    shape: 'drop',
  },
  {
    id: 'tablespoon',
    name: 'Sip / Tablespoon',
    volumeLiters: 0.015,
    icon: '🥄',
    description: 'A 15 mL tablespoon — about one sip.',
    countable: true,
    shape: 'spoon',
  },
  {
    id: 'cup',
    name: 'Cup / Glass',
    volumeLiters: 0.25,
    icon: '🥤',
    description: 'A standard 250 mL glass of water.',
    countable: true,
    shape: 'glass',
  },
  {
    id: 'small-bottle',
    name: 'Small Water Bottle',
    volumeLiters: 0.5,
    icon: '🍼',
    description: 'The classic 500 mL bottle — one 500-token prompt at the default rate.',
    countable: true,
    shape: 'bottle-small',
  },
  {
    id: 'bottle',
    name: 'Standard Bottle',
    volumeLiters: 1.5,
    icon: '🧃',
    description: 'A 1.5 L family-size bottle.',
    countable: true,
    shape: 'bottle',
  },
  {
    id: 'bucket',
    name: 'Bucket',
    volumeLiters: 15,
    range: { min: 10, max: 20 },
    icon: '🪣',
    description: 'Household buckets hold between 10 and 20 L.',
    countable: true,
    shape: 'bucket',
  },
  {
    id: 'jug',
    name: 'Water Gallon / Jug',
    volumeLiters: 20,
    icon: '🛢️',
    description: 'The 20 L jug that sits on top of an office water cooler.',
    countable: true,
    shape: 'jug',
  },
  {
    id: 'drum',
    name: 'Drum / Barrel',
    volumeLiters: 200,
    icon: '🛢️',
    description: 'A 200 L industrial drum.',
    countable: true,
    shape: 'drum',
  },
  {
    id: 'small-tank',
    name: 'Small Water Tank',
    volumeLiters: 500,
    icon: '🚰',
    description: 'A 500 L rooftop water tank, common on houses in Brazil.',
    countable: true,
    shape: 'tank',
  },
  {
    id: 'tank',
    name: 'Standard Water Tank',
    volumeLiters: 1000,
    icon: '🚰',
    description: '1,000 L — exactly one cubic metre.',
    countable: true,
    shape: 'tank',
  },
  {
    id: 'small-truck',
    name: 'Small Water Truck',
    volumeLiters: 5000,
    icon: '🚛',
    description: 'A 5,000 L water truck.',
    countable: true,
    shape: 'truck',
  },
  {
    id: 'large-truck',
    name: 'Large Water Truck',
    volumeLiters: 15_000,
    range: { min: 10_000, max: 20_000 },
    icon: '🚛',
    description: 'Large water trucks carry between 10,000 and 20,000 L.',
    countable: true,
    shape: 'truck-large',
  },
  {
    id: 'residential-pool',
    name: 'Residential Swimming Pool',
    volumeLiters: 35_000,
    range: { min: 20_000, max: 50_000 },
    icon: '🏊',
    description: 'Backyard pools hold roughly 20,000 to 50,000 L.',
    countable: true,
    shape: 'pool',
  },
  {
    id: 'large-pool',
    name: 'Large Swimming Pool',
    volumeLiters: 100_000,
    icon: '🏊',
    description: 'A 100,000 L club or hotel pool.',
    countable: true,
    shape: 'pool-large',
  },
  {
    id: 'olympic-pool',
    name: 'Olympic Swimming Pool',
    volumeLiters: 2_500_000,
    icon: '🏊',
    description: '50 × 25 × 2 m — 2,500 m³ of water.',
    countable: true,
    shape: 'pool-olympic',
  },
  {
    id: 'small-lake',
    name: 'Small Lake / Reservoir',
    volumeLiters: 100_000_000,
    icon: '🏞️',
    description: '100,000 m³ — a small lake or reservoir.',
    countable: true,
    shape: 'lake',
  },
  {
    id: 'amazon',
    name: 'Amazon River (Daily discharge)',
    volumeLiters: 18_000_000_000_000,
    icon: '🌊',
    description: 'The Amazon pours about 18 km³ into the Atlantic every day (≈ 209,000 m³/s).',
    countable: false,
    shape: 'river',
  },
  {
    id: 'mediterranean',
    name: 'Mediterranean Sea',
    volumeLiters: 3.75e18,
    icon: '🌊',
    description: 'About 3.75 million km³ of seawater.',
    countable: false,
    shape: 'sea',
  },
  {
    id: 'atlantic',
    name: 'Atlantic Ocean',
    volumeLiters: 3.1e20,
    icon: '🌊',
    description: 'About 310 million km³ — more than a fifth of all the water on Earth.',
    countable: false,
    shape: 'ocean',
  },
  {
    id: 'earth',
    name: 'Total Water on Earth',
    volumeLiters: 1.386e21,
    icon: '🌍',
    description: 'About 1.386 billion km³: oceans, ice, groundwater, lakes, rivers and vapour (USGS).',
    countable: false,
    shape: 'globe',
  },
] as const satisfies readonly Tier[]

export const TIER_COUNT = TIERS.length

/**
 * Tokens Claude (Opus 5.5, via Claude Code) processed to build this app, summed
 * from the session transcript with `scripts/count-session-tokens.mjs`. Almost
 * all of it is re-reading the conversation context on each call; the model
 * wrote about half a million tokens of code, tests and replies. Snapshot taken
 * when the preset was added (2026-09-24).
 */
export const THIS_PROJECT_TOKENS = 130_685_861

/** Everyday prompts up to frontier-scale training runs — plus the cost of building this very app. */
export const PRESETS = [
  { id: 'short-query', tokens: 150 },
  { id: 'extended-chat', tokens: 10_000 },
  { id: 'book-summary', tokens: 100_000 },
  { id: 'frontier-training', tokens: 15_000_000_000_000 },
  { id: 'this-project', tokens: THIS_PROJECT_TOKENS },
] as const satisfies readonly Preset[]
