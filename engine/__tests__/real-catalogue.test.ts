import { describe, it, expect } from 'vitest'
import { catalogue, checkupItems, readingRuleSet } from '../catalogue'
import { diagnose, prescribe, outcome, followup } from '../index'
import type { Checkup, Diagnosis, Plan, PlacedMeasure, StressorId } from '../types'
import casebook from '../../data/d24/casebook.json'

const ALL = catalogue.stressors.map((s) => s.id)

function diagWith(confirmed: StressorId[]): Diagnosis {
  const d = {} as Diagnosis
  for (const id of ALL) {
    d[id] = confirmed.includes(id)
      ? { status: 'CONFIRMED', evidence: [], settleWith: [] }
      : { status: 'NOT_ASSESSED', evidence: [], settleWith: [] }
  }
  return d
}

const smart = (indicator: string) => ({
  specific: 'Reach-scale improvement',
  indicator,
  measurable: 1,
  timeBound: '2028-06-30',
})
const placed = (measureId: string, indicator = 'odour'): PlacedMeasure => ({ measureId, objective: smart(indicator) })
const plan = (id: string, measures: PlacedMeasure[]): Plan => ({
  id,
  name: id,
  impactReachId: 'impact',
  controlReachId: 'control',
  measures,
  overrides: [],
})

describe('real catalogue: data integrity the engine relies on', () => {
  it('has 12 stressors, 43 measures and every rule R1..R8 with a cite', () => {
    expect(catalogue.stressors).toHaveLength(12)
    expect(catalogue.measures).toHaveLength(43)
    for (const r of ['R1', 'R1a', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8']) {
      const rule = catalogue.rules.find((x) => x.id === r)
      expect(rule, r).toBeTruthy()
      expect(rule!.page).toBeGreaterThan(0)
      expect(rule!.quote.length).toBeGreaterThan(10)
    }
  })

  it('R1 cites the bucket sentence on p.19', () => {
    const r1 = catalogue.rules.find((x) => x.id === 'R1')!
    expect(r1.page).toBe(19)
    expect(r1.quote).toContain('fixing the leaks in a bucket')
  })
})

describe('real catalogue: planted controls', () => {
  const s01 = diagWith(['S01'])

  it('NAIVE plan: re-meandering (4.3.3) with S01 confirmed and no first-line measure is CONTRAINDICATED by R1', () => {
    const a = prescribe(catalogue, s01, plan('naive', [placed('4.3.3', 'bank-stability')]))
    const m = a.measures.find((x) => x.measureId === '4.3.3')!
    expect(m.verdict).toBe('CONTRAINDICATED')
    expect(m.reasons[0].rule).toBe('R1')
    expect(m.reasons[0].page).toBe(19)
    expect(m.reasons[0].instead).toContain('4.2.2')
    expect(a.verdict).toBe('BLOCKED')
    expect(a.uncovered).toEqual(['S01'])
  })

  it('SEWER-FIRST plan: 4.2.2 then 4.3.3 is not contraindicated and is SIGNABLE', () => {
    const a = prescribe(catalogue, s01, plan('sewer-first', [placed('4.2.2'), placed('4.3.3', 'bank-stability')]))
    expect(a.measures.every((x) => x.verdict !== 'CONTRAINDICATED')).toBe(true)
    expect(a.verdict).toBe('SIGNABLE')
  })

  it('MUTATION: with R1 disabled the naive plan is no longer contraindicated (the control depends on R1)', () => {
    const a = prescribe(catalogue, s01, plan('naive', [placed('4.3.3', 'bank-stability')]), { disabledRules: ['R1'] })
    expect(a.measures[0]!.verdict).not.toBe('CONTRAINDICATED')
  })

  it('SYMPTOM ONLY: invasive control (4.5.1) alone with S01 confirmed', () => {
    const a = prescribe(catalogue, s01, plan('invasive', [placed('4.5.1', 'riparian-cover')]))
    expect(a.measures[0]!.verdict).toBe('SYMPTOM_ONLY')
  })

  it('LAST RESORT: a compensatory rain garden (4.6.1) with no infeasibility recorded is DEFERRED', () => {
    const a = prescribe(catalogue, diagWith([]), plan('rain', [placed('4.6.1', 'flow-permanence')]))
    expect(a.measures[0]!.verdict).toBe('DEFERRED')
  })
})

describe('real catalogue: casebook replay (positive control)', () => {
  type Case = { id: string; name: string; stressorsReported: StressorId[]; measures: { measureId: string; order: number }[] }
  const cases = casebook as unknown as Case[]

  // Casebook cases mention a technique more than once; a plan holds each measure once (lowest order wins).
  const dedupe = (ms: { measureId: string; order: number }[]) =>
    [...ms].sort((a, b) => a.order - b.order).filter((m, i, a) => a.findIndex((x) => x.measureId === m.measureId) === i).map((m) => placed(m.measureId, 'odour'))

  it('the Emscher plan (sewer first, then renaturalisation) draws no CONTRAINDICATED verdict', () => {
    const emscher = cases.find((c) => c.id === '5.1.2')!
    expect(emscher.measures[0]!.measureId).toBe('4.2.2')
    const ms = dedupe(emscher.measures)
    const a = prescribe(catalogue, diagWith(emscher.stressorsReported), plan('emscher', ms))
    const bad = a.measures.filter((x) => x.verdict === 'CONTRAINDICATED')
    expect(bad).toEqual([])
  })

  it('every casebook plan runs without throwing and every verdict carries a reason with a real page', () => {
    for (const c of cases) {
      const ms = dedupe(c.measures)
      const a = prescribe(catalogue, diagWith(c.stressorsReported), plan(c.id, ms))
      expect(a.reasons.length, c.id).toBeGreaterThan(0)
      for (const m of a.measures) {
        expect(m.reasons.length).toBeGreaterThan(0)
        for (const r of m.reasons) {
          expect(r.page).toBeGreaterThan(0)
          expect(catalogue.rules.some((x) => x.page === r.page && x.quote === r.quote)).toBe(true)
        }
      }
    }
  })
})

describe('real catalogue: diagnosis and the LLM-cannot-own-verdict control', () => {
  const odourItem = checkupItems.find((i) => i.id === 'ci-odour')!
  const mk = (id: string, observer: string): Checkup => ({
    id,
    reachId: 'impact',
    date: '2026-05-01',
    observer,
    provenance: 'scenario',
    answers: { 'ci-odour': 'strongly' },
  })

  it('one citizen answer only SUSPECTS S01; a second independent observer CONFIRMS', () => {
    expect(odourItem).toBeTruthy()
    const one = diagnose(catalogue, [mk('c1', 'a')], checkupItems, readingRuleSet, [])
    expect(one.S01.status).toBe('SUSPECTED')
    const two = diagnose(catalogue, [mk('c1', 'a'), mk('c2', 'b')], checkupItems, readingRuleSet, [])
    expect(two.S01.status).toBe('CONFIRMED')
  })

  it('accepted LLM proposals alone never confirm', () => {
    const props = Array.from({ length: 50 }, (_, i) => ({ stressor: 'S01' as const, quote: 'smells', checkupId: 'c' + i }))
    const d = diagnose(catalogue, [], checkupItems, readingRuleSet, props)
    expect(d.S01.status).toBe('SUSPECTED')
  })
})

describe('real catalogue: outcome clock (R7) on a slow, vegetated measure', () => {
  it('riparian planting (4.1.1) built 2026-01-01 is NOT_YET_KNOWABLE until 2028-12-31 (3 years, D2.4 p.26)', () => {
    const p = plan('ripar', [{ ...placed('4.1.1', 'riparian-cover'), implementedOn: '2026-01-01' }])
    const r = outcome(catalogue, p, '4.1.1', 'riparian-cover', [], '2027-01-01')
    expect(r.verdict).toBe('NOT_YET_KNOWABLE')
    expect(r.knowableFrom).toBe('2028-12-31')
    expect(r.reasons[0].rule).toBe('R7')
    const f = followup(catalogue, p, [], '2027-01-01')
    expect(f.items.find((i) => i.indicator === 'riparian-cover')!.knowableFrom).toBe('2028-12-31')
  })
})
