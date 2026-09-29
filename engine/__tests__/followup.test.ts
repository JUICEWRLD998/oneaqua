import { describe, it, expect } from 'vitest'
import { followup } from '../followup'
import { cat, checkup, baciCheckups, planOf, place } from './fixtures'

const TODAY = '2027-12-01'

describe('followup', () => {
  it('unbuilt measure: knowableFrom is null and every cell needs the minimum after', () => {
    const f = followup(cat, planOf(['4.2.2']), [], TODAY)
    expect(f.planId).toBe('plan-1')
    expect(f.items).toHaveLength(1)
    const it0 = f.items[0]!
    expect(it0.knowableFrom).toBeNull()
    expect(it0.design).toBe('BACI')
    expect(it0.visitsNeeded).toEqual({ beforeImpact: 3, afterImpact: 3, beforeControl: 3, afterControl: 3 })
  })

  it('unbuilt: existing check-ups all count as before', () => {
    const cs = [1, 2].map((i) => checkup(`c${i}`, { indicators: { IND1: 3 } }))
    const f = followup(cat, planOf(['4.2.2']), cs, TODAY)
    expect(f.items[0]!.visitsNeeded.beforeImpact).toBe(1)
    expect(f.items[0]!.visitsNeeded.afterImpact).toBe(3)
  })

  it('lag: max of measure and indicator classes (medium 180d)', () => {
    const p = planOf([])
    p.measures = [place('4.2.2', { implementedOn: '2027-01-01' })]
    expect(followup(cat, p, [], TODAY).items[0]!.knowableFrom).toBe('2027-06-30')
  })

  it('lag: the slower class wins (fast measure, medium indicator)', () => {
    const p = planOf([])
    p.measures = [place('4.1.1', { implementedOn: '2027-01-01' })]
    const f = followup(cat, p, [], TODAY)
    const ind1 = f.items.find((i) => i.indicator === 'IND1')!
    const ind2 = f.items.find((i) => i.indicator === 'IND2')!
    expect(ind1.knowableFrom).toBe('2027-06-30') // 180d via indicator
    expect(ind2.knowableFrom).toBe('2027-01-31') // 30d
  })

  it('establishmentYears overrides the lag classes', () => {
    const p = planOf([])
    p.measures = [place('4.7.1', { implementedOn: '2027-01-01' })]
    expect(followup(cat, p, [], TODAY).items[0]!.knowableFrom).toBe('2029-12-31') // 3*365 = 1095 days
  })

  it('skips indicators that are missing from the catalogue or not citizen observable', () => {
    const f = followup(cat, planOf(['4.1.1']), [], TODAY)
    expect(f.items.map((i) => i.indicator).sort()).toEqual(['IND1', 'IND2'])
  })

  it('counts before/after cells on impact and control reaches', () => {
    const p = planOf([])
    p.measures = [place('4.2.2', { implementedOn: '2027-06-01' })]
    const cs = baciCheckups({ n: { bi: 3, ai: 1, bc: 2, ac: 5 }, impactShift: 0, controlShift: 0 })
    const v = followup(cat, p, cs, TODAY).items[0]!.visitsNeeded
    expect(v).toEqual({ beforeImpact: 0, afterImpact: 2, beforeControl: 1, afterControl: 0 })
  })

  it('ignores check-ups without a numeric indicator and on other reaches', () => {
    const p = planOf([])
    p.measures = [place('4.2.2', { implementedOn: '2027-06-01' })]
    const cs = [
      checkup('a', { indicators: { IND1: 3 } }),
      checkup('b'),
      checkup('c', { reachId: 'elsewhere', indicators: { IND1: 3 } }),
      checkup('d', { indicators: { IND1: Number.NaN } }),
    ]
    expect(followup(cat, p, cs, TODAY).items[0]!.visitsNeeded.beforeImpact).toBe(2)
  })

  it('no control reach: design BA, control cells need 0, R8 reason says so', () => {
    const p = planOf(['4.2.2'], { controlReachId: undefined })
    const it0 = followup(cat, p, [], TODAY).items[0]!
    expect(it0.design).toBe('BA')
    expect(it0.visitsNeeded.beforeControl).toBe(0)
    expect(it0.visitsNeeded.afterControl).toBe(0)
    expect(it0.reasons[1]!.rule).toBe('R8')
    expect(it0.reasons[1]!.plain).toMatch(/before-after only, no control reach/i)
  })

  it('every item has R7 then R8 reasons from the catalogue', () => {
    for (const it0 of followup(cat, planOf(['4.2.2', '4.1.1']), [], TODAY).items) {
      expect(it0.reasons.map((r) => r.rule)).toEqual(['R7', 'R8'])
      for (const r of it0.reasons) expect(r.quote).toBe(cat.rules.find((x) => x.id === r.rule)!.quote)
    }
  })

  it('throws on an unknown measure', () => {
    expect(() => followup(cat, planOf(['9.9.9']), [], TODAY)).toThrow()
  })
})
