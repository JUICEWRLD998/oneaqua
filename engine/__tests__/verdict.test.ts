import { describe, it, expect } from 'vitest'
import { outcome } from '../verdict'
import { cat, baciCheckups, planOf, place } from './fixtures'
import type { Plan } from '../types'

const IMPL = '2027-06-01'
// 4.2.2 is medium, IND1 is medium: 180 days => knowableFrom 2027-11-28
const KNOWABLE = '2027-11-28'
const TODAY = '2027-12-15'
const built = (extra: Partial<Plan> = {}): Plan => {
  const p = planOf([], extra)
  p.measures = [place('4.2.2', { implementedOn: IMPL })]
  return p
}
const run = (plan: Plan, cs: ReturnType<typeof baciCheckups>, today = TODAY, seed?: number) =>
  outcome(cat, plan, '4.2.2', 'IND1', cs, today, undefined, seed)

describe('outcome', () => {
  it('planted +2 effect, n=6 per cell: IMPROVED', () => {
    const r = run(built(), baciCheckups({ n: 6, impactShift: 2, controlShift: 0 }))
    expect(r.verdict).toBe('IMPROVED')
    expect(r.design).toBe('BACI')
    expect(r.contrast).toBeGreaterThan(1.7)
    expect(r.ci!.low).toBeGreaterThan(0)
    expect(r.ci!.level).toBe(0.9)
    expect(r.delta).toBe(1)
    expect(r.cells.beforeImpact.n).toBe(6)
    expect(r.cells.afterControl?.n).toBe(6)
  })

  it('planted -2 effect: DECLINED', () => {
    const r = run(built(), baciCheckups({ n: 6, impactShift: -2, controlShift: 0 }))
    expect(r.verdict).toBe('DECLINED')
    expect(r.ci!.high).toBeLessThan(0)
  })

  it('zero effect, n=30 per cell: NO_DETECTABLE_CHANGE', () => {
    const r = run(built(), baciCheckups({ n: 30, impactShift: 0, controlShift: 0 }))
    expect(r.verdict).toBe('NO_DETECTABLE_CHANGE')
    expect(r.ci!.low).toBeGreaterThan(-1)
    expect(r.ci!.high).toBeLessThan(1)
  })

  it('control shifts +2 alongside the impact reach: CONFOUNDED', () => {
    const r = run(built(), baciCheckups({ n: 6, impactShift: 2, controlShift: 2 }))
    expect(r.verdict).toBe('CONFOUNDED')
    expect(r.reasons[0].rule).toBe('R8')
  })

  it('one cell with n=2: NOT_YET_KNOWABLE (R8) with visitsNeeded >= 1', () => {
    const r = run(built(), baciCheckups({ n: { bi: 6, ai: 2, bc: 6, ac: 6 }, impactShift: 2, controlShift: 0 }))
    expect(r.verdict).toBe('NOT_YET_KNOWABLE')
    expect(r.reasons[0].rule).toBe('R8')
    expect(r.visitsNeeded).toBeGreaterThanOrEqual(1)
    expect(r.contrast).toBeUndefined()
  })

  it('an empty cell is NOT_YET_KNOWABLE even with R8 disabled', () => {
    const cs = baciCheckups({ n: { bi: 6, ai: 6, bc: 6, ac: 0 }, impactShift: 2, controlShift: 0 })
    const r = outcome(cat, built(), '4.2.2', 'IND1', cs, TODAY, { disabledRules: ['R8'] })
    expect(r.verdict).toBe('NOT_YET_KNOWABLE')
  })

  it('today before knowableFrom: NOT_YET_KNOWABLE (R7) naming the date', () => {
    const r = run(built(), baciCheckups({ n: 6, impactShift: 2, controlShift: 0 }), '2027-10-15')
    expect(r.verdict).toBe('NOT_YET_KNOWABLE')
    expect(r.reasons[0].rule).toBe('R7')
    expect(r.knowableFrom).toBe(KNOWABLE)
    expect(r.visitsNeeded).toBe(0)
  })

  it('on the knowableFrom date the verdict is allowed', () => {
    const r = run(built(), baciCheckups({ n: 6, impactShift: 2, controlShift: 0 }), KNOWABLE)
    expect(r.verdict).toBe('IMPROVED')
  })

  it('R7 shortfall reports the largest cell gap', () => {
    const cs = baciCheckups({ n: { bi: 6, ai: 1, bc: 6, ac: 6 }, impactShift: 2, controlShift: 0 })
    expect(run(built(), cs, '2027-10-15').visitsNeeded).toBe(2)
  })

  it('unbuilt measure: NOT_YET_KNOWABLE (R7, not built yet), no knowableFrom', () => {
    const p = planOf(['4.2.2'])
    const r = run(p, baciCheckups({ n: 6, impactShift: 2, controlShift: 0 }))
    expect(r.verdict).toBe('NOT_YET_KNOWABLE')
    expect(r.reasons[0].rule).toBe('R7')
    expect(r.reasons[0].plain).toMatch(/not built yet/)
    expect(r.knowableFrom).toBeUndefined()
  })

  it('missing control reach: design BA, no control cells, and the result says so', () => {
    const p = built({ controlReachId: undefined })
    const r = run(p, baciCheckups({ n: 6, impactShift: 2, controlShift: 0 }))
    expect(r.design).toBe('BA')
    expect(r.cells.beforeControl).toBeUndefined()
    expect(r.cells.afterControl).toBeUndefined()
    expect(r.verdict).toBe('IMPROVED')
    expect(r.reasons[0].plain).toMatch(/before-after only, no control reach/i)
  })

  it('BA never returns CONFOUNDED (control shift is irrelevant without a control)', () => {
    const p = built({ controlReachId: undefined })
    const r = run(p, baciCheckups({ n: 6, impactShift: 2, controlShift: 2 }))
    expect(r.verdict).not.toBe('CONFOUNDED')
  })

  it('BA with n too small in a cell needs only the impact cells', () => {
    const p = built({ controlReachId: undefined })
    const r = run(p, baciCheckups({ n: { bi: 6, ai: 6, bc: 0, ac: 0 }, impactShift: 2, controlShift: 0 }))
    expect(r.verdict).toBe('IMPROVED')
  })

  it('too-wide interval: NOT_YET_KNOWABLE with a positive visit estimate', () => {
    // A noisy, small-sample effect of about delta: interval crosses delta but not clearly zero-ish
    const cs = baciCheckups({ n: 3, impactShift: 1, controlShift: 0 })
    // widen the noise by hand: replace after-impact values with a spread
    const wide = cs.map((c) => (c.id.startsWith('ai-') ? { ...c, indicators: { IND1: 3 + [-1.5, 1, 4][Number(c.id.slice(3))]! } } : c))
    const r = run(built(), wide)
    expect(r.verdict).toBe('NOT_YET_KNOWABLE')
    expect(r.reasons[0].rule).toBe('R8')
    expect(r.contrast).toBeDefined()
    expect(r.visitsNeeded).toBeGreaterThanOrEqual(1)
  })

  it('is deterministic: same input twice is byte-identical; the seed argument changes the draw', () => {
    const cs = baciCheckups({ n: 6, impactShift: 2, controlShift: 0 })
    const a = JSON.stringify(run(built(), cs))
    expect(JSON.stringify(run(built(), cs))).toBe(a)
    expect(JSON.stringify(run(built(), [...cs].reverse()))).toBe(a)
    expect(JSON.stringify(run(built(), cs, TODAY, 12345))).not.toBe(a)
  })

  it('a different plan id may give a different bootstrap interval', () => {
    const cs = baciCheckups({ n: 6, impactShift: 2, controlShift: 0 })
    const a = run(built(), cs)
    const b = run(built({ id: 'plan-2' }), cs)
    expect(a.verdict).toBe(b.verdict)
    expect(a.contrast).toBe(b.contrast)
    expect(a.ci).not.toEqual(b.ci)
  })

  it('throws on unknown measure, indicator, or measure not in plan', () => {
    const cs = baciCheckups({ n: 6, impactShift: 2, controlShift: 0 })
    expect(() => outcome(cat, built(), '9.9.9', 'IND1', cs, TODAY)).toThrow()
    expect(() => outcome(cat, built(), '4.2.2', 'NOPE', cs, TODAY)).toThrow()
    expect(() => outcome(cat, built(), '4.3.3', 'IND1', cs, TODAY)).toThrow(/not in plan/)
  })

  it('every result carries at least one reason whose page and quote come from the catalogue', () => {
    const scenarios = [
      run(built(), baciCheckups({ n: 6, impactShift: 2, controlShift: 0 })),
      run(built(), baciCheckups({ n: 2, impactShift: 2, controlShift: 0 })),
      run(built(), baciCheckups({ n: 6, impactShift: 2, controlShift: 0 }), '2027-07-01'),
      run(planOf(['4.2.2']), []),
    ]
    for (const r of scenarios) {
      expect(r.reasons.length).toBeGreaterThanOrEqual(1)
      for (const x of r.reasons) {
        const def = cat.rules.find((d) => d.id === x.rule)!
        expect([x.page, x.quote]).toEqual([def.page, def.quote])
      }
    }
  })
})
