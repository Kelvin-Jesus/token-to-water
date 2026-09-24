import { describe, expectTypeOf, it } from 'vitest'
import { TIERS } from '@/constants/scales'
import type { MessageKey, Messages } from '@/i18n/messages'
import { en, ptBR } from '@/i18n/messages'
import type { Equivalence, Tier, TierId } from '@/types'

/**
 * Compile-time tests (run with `vitest --typecheck`): they fail the build, not
 * a runtime assertion, when the type contracts drift.
 */
describe('type contracts', () => {
  it('derives tier ids from the single TIER_IDS list', () => {
    expectTypeOf<(typeof TIERS)[number]['id']>().toEqualTypeOf<TierId>()
    expectTypeOf<(typeof TIERS)[number]>().toExtend<Tier>()
  })

  it('forces every translation to provide exactly the English keys', () => {
    expectTypeOf(ptBR).toEqualTypeOf<Messages>()
    expectTypeOf<keyof typeof en>().toEqualTypeOf<MessageKey>()
    expectTypeOf<keyof Messages>().toEqualTypeOf<MessageKey>()
  })

  it('narrows equivalences by kind, so each phrasing only sees its own data', () => {
    expectTypeOf<Extract<Equivalence, { kind: 'count' }>>().toHaveProperty('terms')
    expectTypeOf<Extract<Equivalence, { kind: 'count' }>>().not.toHaveProperty('tier')
    expectTypeOf<Extract<Equivalence, { kind: 'multiple' }>>().toHaveProperty('count').toEqualTypeOf<number>()
    expectTypeOf<Extract<Equivalence, { kind: 'empty' }>>().not.toHaveProperty('count')
  })

  it('rejects unknown tier ids', () => {
    expectTypeOf<'swimming-pool'>().not.toExtend<TierId>()
    expectTypeOf<'olympic-pool'>().toExtend<TierId>()
  })
})
