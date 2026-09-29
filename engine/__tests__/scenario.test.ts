import { describe, it, expect } from 'vitest'
import { catalogue, checkupItems, readingRuleSet } from '../catalogue'
import { scenario } from '../scenario'
import { diagnose, prescribe, outcome, followup } from '../index'

const dx = () => diagnose(catalogue, scenario.checkups.filter((c) => c.date < scenario.diagnosisCutoff), checkupItems, readingRuleSet, [])

describe('scenario fixture invariants (the demo beats must survive any re-scale)', () => {
  it('every record is labelled scenario, and both variants have the same shape', () => {
    for (const c of [...scenario.checkups, ...scenario.checkupsControlMoved]) expect(c.provenance).toBe('scenario')
    expect(scenario.checkups).toHaveLength(scenario.checkupsControlMoved.length)
    expect(scenario._label).toMatch(/^SCENARIO/)
  })

  it('baseline check-ups CONFIRM S01 and S07 (two independent observers), nothing else', () => {
    const d = dx()
    expect(d.S01.status).toBe('CONFIRMED')
    expect(d.S07.status).toBe('CONFIRMED')
    expect(d.S01.evidence.length).toBeGreaterThan(1)
  })

  it('BEAT 1: the naive re-meander plan is BLOCKED by R1 (p.19) and points to 4.2.2 / 4.1.1', () => {
    const a = prescribe(catalogue, dx(), scenario.plans.naive)
    expect(a.verdict).toBe('BLOCKED')
    const m = a.measures[0]!
    expect(m.verdict).toBe('CONTRAINDICATED')
    expect(m.reasons[0].rule).toBe('R1')
    expect(m.reasons[0].page).toBe(19)
    expect(m.reasons[0].instead).toEqual(expect.arrayContaining(['4.2.2']))
  })

  it('the first-line plan is SIGNABLE', () => {
    expect(prescribe(catalogue, dx(), scenario.plans.firstline).verdict).toBe('SIGNABLE')
  })

  it('BEAT 2a: sewer works on odour are IMPROVED by BACI', () => {
    const r = outcome(catalogue, scenario.plans.firstline, '4.2.2', 'odour', scenario.checkups, scenario.asOf)
    expect(r.verdict).toBe('IMPROVED')
    expect(r.design).toBe('BACI')
    expect(r.contrast!).toBeGreaterThanOrEqual(1)
  })

  it('BEAT 2b: riparian regeneration is NOT_YET_KNOWABLE until 2029-03-14 (3-year window)', () => {
    const r = outcome(catalogue, scenario.plans.firstline, '4.1.1', 'riparian-cover', scenario.checkups, scenario.asOf)
    expect(r.verdict).toBe('NOT_YET_KNOWABLE')
    expect(r.knowableFrom).toBe('2029-03-14')
  })

  it('BEAT 2c: when the control reach also improves, the same works are CONFOUNDED', () => {
    const r = outcome(catalogue, scenario.plans.firstline, '4.2.2', 'odour', scenario.checkupsControlMoved, scenario.asOf)
    expect(r.verdict).toBe('CONFOUNDED')
  })

  it('follow-up schedules a BACI design with a knowable date per built measure', () => {
    const f = followup(catalogue, scenario.plans.firstline, scenario.checkups, scenario.asOf)
    expect(f.items.length).toBeGreaterThan(0)
    expect(f.items.every((i) => i.design === 'BACI')).toBe(true)
    expect(f.items.find((i) => i.measureId === '4.3.3')!.knowableFrom).toBeNull()
  })

  it('outcome verdicts are reproducible (seeded)', () => {
    const a = outcome(catalogue, scenario.plans.firstline, '4.2.2', 'odour', scenario.checkups, scenario.asOf)
    const b = outcome(catalogue, scenario.plans.firstline, '4.2.2', 'odour', scenario.checkups, scenario.asOf)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
})
