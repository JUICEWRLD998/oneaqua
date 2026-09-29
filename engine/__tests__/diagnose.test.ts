import { describe, it, expect } from 'vitest'
import { diagnose } from '../diagnose'
import { cat, checkup, items, readingRules, IDS } from './fixtures'
import type { AcceptedProposal, ReadingRule } from '../types'

describe('diagnose', () => {
  it('covers all 12 stressors and defaults to NOT_ASSESSED', () => {
    const d = diagnose(cat, [], items, readingRules, [])
    expect(Object.keys(d).sort()).toEqual(IDS)
    for (const id of IDS) expect(d[id].status).toBe('NOT_ASSESSED')
  })

  it('one citizen answer only SUSPECTS, even if the item says confirm', () => {
    const d = diagnose(cat, [checkup('c1', { answers: { I1: 'yes' } })], items, readingRules, [])
    expect(d.S01.status).toBe('SUSPECTED')
    expect(d.S01.evidence).toEqual([{ source: 'item', checkupId: 'c1', ref: 'I1', strength: 'suggest' }])
  })

  it('non-matching answers give no evidence', () => {
    const d = diagnose(cat, [checkup('c1', { answers: { I1: 'no', ZZ: 'yes' } })], items, readingRules, [])
    expect(d.S01.status).toBe('NOT_ASSESSED')
  })

  it('two distinct observers confirm; the same observer twice does not', () => {
    const same = diagnose(
      cat,
      [checkup('c1', { answers: { I1: 'yes' } }), checkup('c2', { answers: { I1: 'yes' } })],
      items, readingRules, [],
    )
    expect(same.S01.status).toBe('SUSPECTED')
    const two = diagnose(
      cat,
      [checkup('c1', { answers: { I1: 'yes' } }), checkup('c2', { observer: 'obs-b', answers: { I1: 'yes' } })],
      items, readingRules, [],
    )
    expect(two.S01.status).toBe('CONFIRMED')
    expect(two.S01.settleWith).toEqual([])
  })

  it('a sourced reading confirms alone; an unsourced rule is ignored', () => {
    const d = diagnose(cat, [checkup('c1', { readings: { RR1: 0.9, RR2: 5 } })], items, readingRules, [])
    expect(d.S01.status).toBe('CONFIRMED')
    expect(d.S01.evidence[0]).toMatchObject({ source: 'reading', strength: 'confirm', ref: 'RR1' })
    expect(d.S03.status).toBe('NOT_ASSESSED')
  })

  it('reading below threshold does not confirm; every operator works', () => {
    const rr = (op: ReadingRule['op']): ReadingRule => ({ id: 'X', name: 'x', unit: 'u', stressor: 'S05', op, threshold: 1, source: 's' })
    const at = (op: ReadingRule['op'], v: number) =>
      diagnose(cat, [checkup('c', { readings: { X: v } })], [], [rr(op)], []).S05.status
    expect(at('>', 1)).toBe('NOT_ASSESSED')
    expect(at('>', 1.1)).toBe('CONFIRMED')
    expect(at('>=', 1)).toBe('CONFIRMED')
    expect(at('<', 1)).toBe('NOT_ASSESSED')
    expect(at('<', 0.9)).toBe('CONFIRMED')
    expect(at('<=', 1)).toBe('CONFIRMED')
    expect(at('<=', 1.1)).toBe('NOT_ASSESSED')
  })

  it('a checkup without readings or a missing reading key adds nothing', () => {
    const d = diagnose(cat, [checkup('c1', { readings: { OTHER: 9 } })], items, readingRules, [])
    expect(d.S01.status).toBe('NOT_ASSESSED')
  })

  it('accepted proposals are suggest-only and never confirm, however many', () => {
    const one: AcceptedProposal[] = [{ stressor: 'S02', quote: 'a weir', checkupId: 'c1' }]
    expect(diagnose(cat, [], items, readingRules, one).S02.status).toBe('SUSPECTED')
    const many: AcceptedProposal[] = Array.from({ length: 100 }, (_, i) => ({ stressor: 'S02', quote: `q${i}`, checkupId: `c${i}` }))
    const d = diagnose(cat, [], items, readingRules, many)
    expect(d.S02.status).toBe('SUSPECTED')
    expect(d.S02.evidence.every((e) => e.source === 'accepted-proposal' && e.strength === 'suggest')).toBe(true)
  })

  it('a proposal plus one observer does not make two observers', () => {
    const d = diagnose(
      cat,
      [checkup('c1', { answers: { I2: 'yes' } })],
      items, readingRules,
      [{ stressor: 'S02', quote: 'q', checkupId: 'c9' }],
    )
    expect(d.S02.status).toBe('SUSPECTED')
  })

  it('settleWith lists sorted unique items and rules for non-confirmed stressors', () => {
    const d = diagnose(cat, [], items, readingRules, [])
    expect(d.S01.settleWith).toEqual(['I1', 'RR1'])
    expect(d.S02.settleWith).toEqual(['I2'])
    expect(d.S04.settleWith).toEqual([])
  })

  it('evidence is sorted by checkupId then ref regardless of input order', () => {
    const cs = [
      checkup('c2', { answers: { I1: 'yes' } }),
      checkup('c1', { observer: 'obs-b', answers: { I1: 'yes' } }),
    ]
    const a = diagnose(cat, cs, items, readingRules, [])
    const b = diagnose(cat, [...cs].reverse(), items, readingRules, [])
    expect(a.S01.evidence.map((e) => e.checkupId)).toEqual(['c1', 'c2'])
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
})
