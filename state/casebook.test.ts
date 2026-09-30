import { describe, expect, it } from 'vitest'
import { listCases, replay } from './casebook'
import { initialState, derive, setAnswer, answerOf, checkupsFor } from './model'
import { catalogue } from '../engine/catalogue'
import { prescribe } from '../engine/index'
import type { Diagnosis } from '../engine/types'

describe('casebook replay', () => {
  it('Emscher replays with zero refusals and starts with 4.2.2', () => {
    const r = replay('5.1.2')!
    expect(r.steps[0]!.measureId).toBe('4.2.2')
    expect(r.refusals).toBe(0)
    expect(r.steps.length).toBeGreaterThan(5)
    for (const s of r.steps) expect(s.reason.page).toBeGreaterThan(0)
  })
  it('every case replays and every step carries a verdict and a cited reason', () => {
    for (const c of listCases()) {
      const r = replay(c.id)!
      expect(r.steps).toHaveLength(c.measureCount)
      for (const s of r.steps) {
        expect(s.verdict).toBeTruthy()
        expect(s.reason.quote.length).toBeGreaterThan(0)
      }
    }
  })
  it('planted control: the same engine refuses the same measure when the sewer step is missing', () => {
    const dx = {} as Diagnosis
    for (const s of catalogue.stressors) dx[s.id] = { status: ['S01', 'S05', 'S09', 'S03'].includes(s.id) ? 'CONFIRMED' : 'NOT_ASSESSED', evidence: [], settleWith: [] }
    const a = prescribe(catalogue, dx, {
      id: 'x', name: 'x', impactReachId: 'vale-impact', overrides: [],
      measures: [{ measureId: '4.3.3', objective: { specific: 's', indicator: 'odour', measurable: 1, timeBound: '2030-01-01' } }],
    })
    expect(a.measures[0]!.verdict).toBe('CONTRAINDICATED')
    expect(replay('5.1.2')!.steps.find((s) => s.measureId === '4.3.3')!.verdict).not.toBe('CONTRAINDICATED')
  })
  it('unknown case is null', () => expect(replay('nope')).toBeNull())
})

describe('custom check-up sheets (/new)', () => {
  it('one observer SUSPECTS, two distinct observers CONFIRM', () => {
    let s = initialState('mine')
    s = setAnswer(s, 'A', 'ci-odour', 'strongly')
    expect(derive(s).diagnosis.S01.status).toBe('SUSPECTED')
    s = setAnswer(s, 'B', 'ci-odour', 'strongly')
    expect(derive(s).diagnosis.S01.status).toBe('CONFIRMED')
    expect(checkupsFor(s)).toHaveLength(2)
  })
  it('clearing removes; invalid answers/items ignored; the scenario state is untouched', () => {
    let s = initialState('mine')
    s = setAnswer(s, 'A', 'ci-odour', 'strongly')
    expect(answerOf(s, 'A', 'ci-odour')).toBe('strongly')
    expect(setAnswer(s, 'A', 'ci-odour', 'bogus')).toBe(s)
    expect(setAnswer(s, 'A', 'nope', 'x')).toBe(s)
    s = setAnswer(s, 'A', 'ci-odour', null)
    expect(s.customCheckups).toHaveLength(0)
    const sc = initialState('firstline')
    expect(setAnswer(sc, 'A', 'ci-odour', 'strongly')).toBe(sc)
    expect(sc.customCheckups).toBeUndefined()
  })
})
