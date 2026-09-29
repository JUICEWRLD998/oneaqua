import { describe, it, expect } from 'vitest'
import {
  initialState, placeMeasure, removeMeasure, addOverride, derive, encodeState, decodeState, setVariant, acceptProposal,
  defaultObjective, getMeasure,
} from './model'

const urlsafe = (s: string) => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

describe('state model', () => {
  it('BEAT 1 through the state layer: placing re-meandering on an empty plan is refused by R1 with a p.19 cite', () => {
    const s = placeMeasure(initialState('empty'), '4.3.3')
    const d = derive(s)
    expect(d.assessment.verdict).toBe('BLOCKED')
    expect(d.assessment.measures[0]!.reasons[0]!.page).toBe(19)
    expect(d.assessment.measures[0]!.reasons[0]!.instead).toContain('4.2.2')
  })

  it('unscripted path: a mix of measures each get a verdict with a reason (no dead ends)', () => {
    let s = initialState('empty')
    const ids = ['4.1.1', '4.2.2', '4.3.3', '4.5.1', '4.6.1', '4.7.1']
    for (const id of ids) s = placeMeasure(s, id)
    const d = derive(s)
    expect(d.assessment.measures.map((m) => m.measureId).sort()).toEqual([...ids].sort())
    for (const m of d.assessment.measures) expect(m.reasons.length).toBeGreaterThan(0)
  })

  it('every one of the 43 catalogue measures can be placed alone without throwing and yields a reasoned verdict', () => {
    const ids = derive(initialState('firstline')).assessment.measures.length // sanity: scenario plan derives
    expect(ids).toBeGreaterThan(0)
    const all = ['4.1.1', '4.1.2', '4.1.3', '4.1.4', '4.2.1', '4.2.2', '4.2.3']
    for (let i = 1; i <= 21; i++) all.push('4.3.' + i)
    all.push('4.4.1', '4.4.2', '4.4.3', '4.4.4', '4.5.1')
    for (let i = 1; i <= 7; i++) all.push('4.6.' + i)
    all.push('4.7.1', '4.7.2', '4.7.3')
    expect(all).toHaveLength(43)
    for (const id of all) {
      const d = derive(placeMeasure(initialState('empty'), id))
      expect(d.assessment.measures, id).toHaveLength(1)
      expect(d.assessment.measures[0]!.reasons.length, id).toBeGreaterThan(0)
    }
  })

  it('a placed measure carries a valid default SMART objective (R6 is never a surprise)', () => {
    const s = placeMeasure(initialState('empty'), '4.2.2')
    const o = s.plan.measures[0]!.objective!
    expect(o.measurable).toBeGreaterThan(0)
    expect(o.timeBound).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(defaultObjective(getMeasure('4.3.11')!, '2026-09-29').timeBound).toBe('2029-09-28') // 3y x 365d
  })

  it('placing twice is a no-op; unknown ids are ignored; remove drops the measure and its overrides', () => {
    let s = placeMeasure(initialState('empty'), '4.3.3')
    expect(placeMeasure(s, '4.3.3')).toBe(s)
    expect(placeMeasure(s, '9.9.9')).toBe(s)
    s = addOverride(s, { measureId: '4.3.3', rule: 'R1', reason: 'Urban constraint: parallel delivery agreed', approver: 'Officer' })
    s = removeMeasure(s, '4.3.3')
    expect(s.plan.measures).toHaveLength(0)
    expect(s.plan.overrides).toHaveLength(0)
  })

  it('a valid signed override flips CONTRAINDICATED to ALLOWED_BY_OVERRIDE; a 19-char reason does not', () => {
    const base = placeMeasure(initialState('empty'), '4.3.3')
    const short = derive(addOverride(base, { measureId: '4.3.3', rule: 'R1', reason: 'x'.repeat(19), approver: 'A' }))
    expect(short.assessment.measures[0]!.verdict).toBe('CONTRAINDICATED')
    const ok = derive(addOverride(base, { measureId: '4.3.3', rule: 'R1', reason: 'x'.repeat(20), approver: 'A' }))
    expect(ok.assessment.measures[0]!.verdict).toBe('ALLOWED_BY_OVERRIDE')
  })

  it('first-line scenario: SIGNABLE, 4.2.2 odour IMPROVED, unbuilt 4.3.3 produces no outcome (no clock)', () => {
    const d = derive(initialState('firstline'))
    expect(d.assessment.verdict).toBe('SIGNABLE')
    expect(d.outcomes.find((o) => o.measureId === '4.2.2' && o.indicator === 'odour')!.verdict).toBe('IMPROVED')
    expect(d.outcomes.some((o) => o.measureId === '4.3.3')).toBe(false)
  })

  it('control-moved variant turns the same works CONFOUNDED', () => {
    const d = derive(setVariant(initialState('firstline'), 'controlMoved'))
    expect(d.outcomes.find((o) => o.measureId === '4.2.2' && o.indicator === 'odour')!.verdict).toBe('CONFOUNDED')
  })

  it('accepted LLM proposals alone never confirm a stressor (through the state layer)', () => {
    let s = initialState('empty')
    for (let i = 0; i < 20; i++) s = acceptProposal(s, { stressor: 'S02', quote: 'a weir here ' + i, checkupId: 'n' + i })
    expect(derive(s).diagnosis.S02.status).not.toBe('CONFIRMED')
  })

  it('hash round-trips and is deterministic', () => {
    let s = placeMeasure(placeMeasure(initialState('empty'), '4.2.2'), '4.3.3')
    s = setVariant(s, 'controlMoved')
    const h = encodeState(s)
    expect(encodeState(s)).toBe(h)
    expect(decodeState(h)).toEqual(s)
    expect(decodeState('#' + h)).toEqual(s)
  })

  it('hash is hostile input: garbage and wrong versions are rejected; unknown ids, bad dates and reaches are dropped', () => {
    expect(decodeState('not-base64!!')).toBeNull()
    expect(decodeState('')).toBeNull()
    expect(decodeState(urlsafe(JSON.stringify({ v: 2, plan: {} })))).toBeNull()
    expect(decodeState(urlsafe(JSON.stringify({ v: 1, plan: null })))).toBeNull()
    const tampered = {
      v: 1,
      asOf: 'tomorrow',
      plan: {
        id: 'x', name: 'n', impactReachId: '<script>',
        measures: [
          { measureId: '9.9.9' },
          { measureId: '4.2.2', implementedOn: 'yesterday', objective: { specific: 's', indicator: 'nope', measurable: 1, timeBound: '2030-01-01' } },
        ],
        overrides: [],
      },
    }
    const back = decodeState(urlsafe(JSON.stringify(tampered)))!
    expect(back.plan.measures.map((m) => m.measureId)).toEqual(['4.2.2'])
    expect(back.plan.measures[0]!.implementedOn).toBeUndefined()
    expect(back.plan.measures[0]!.objective).toBeUndefined()
    expect(back.asOf).toBe('2026-09-29')
    expect(back.plan.impactReachId).toBe('vale-impact')
  })
})
