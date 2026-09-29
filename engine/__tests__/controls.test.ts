/**
 * The planted positive and negative controls (implementation.md P2.9) on the synthetic catalogue.
 * Each rule has a mutation check: the same scenario with the rule disabled must give a DIFFERENT verdict.
 */
import { describe, it, expect } from 'vitest'
import { diagnose, prescribe, followup, outcome } from '../index'
import type { EngineOptions, Plan, Reason } from '../index'
import { cat, confirmed, planOf, place, validInfeasibility, baciCheckups, items, readingRules, checkup } from './fixtures'

const off = (...r: NonNullable<EngineOptions['disabledRules']>): EngineOptions => ({ disabledRules: r })
const mv = (a: ReturnType<typeof prescribe>, id: string) => a.measures.find((m) => m.measureId === id)!.verdict

describe('planted controls', () => {
  it('naive re-meandering with S01 confirmed and no L1 measure: CONTRAINDICATED by R1, instead has the sewer measure', () => {
    const a = prescribe(cat, confirmed('S01'), planOf(['4.3.3']))
    const m = a.measures[0]!
    expect(m.verdict).toBe('CONTRAINDICATED')
    expect(m.reasons[0].rule).toBe('R1')
    expect(m.reasons[0].instead).toContain('4.2.2')
    expect(a.verdict).toBe('BLOCKED')
  })

  it('sewer-first plan: nothing contraindicated, SIGNABLE', () => {
    const a = prescribe(cat, confirmed('S01'), planOf(['4.2.2', '4.3.3']))
    expect(a.measures.some((m) => m.verdict === 'CONTRAINDICATED')).toBe(false)
    expect(a.verdict).toBe('SIGNABLE')
  })

  it('invasive control alone with S01 confirmed: SYMPTOM_ONLY', () => {
    expect(mv(prescribe(cat, confirmed('S01'), planOf(['4.5.1'])), '4.5.1')).toBe('SYMPTOM_ONLY')
  })

  it('compensatory: DEFERRED without infeasibility, INDICATED with it', () => {
    expect(mv(prescribe(cat, confirmed('S04'), planOf(['4.6.1'])), '4.6.1')).toBe('DEFERRED')
    const p: Plan = { ...planOf([]), measures: [place('4.6.1', { infeasibility: validInfeasibility })] }
    expect(mv(prescribe(cat, confirmed('S04'), p), '4.6.1')).toBe('INDICATED')
  })

  it('barrier promotion when S02 is confirmed', () => {
    expect(mv(prescribe(cat, confirmed('S01', 'S02'), planOf(['4.3.2'])), '4.3.2')).toBe('INDICATED')
    expect(mv(prescribe(cat, confirmed('S01'), planOf(['4.3.2'])), '4.3.2')).toBe('CONTRAINDICATED')
  })

  it('override handling: a 19-character reason is ignored, 20 is applied', () => {
    const mk = (n: number): Plan =>
      planOf(['4.3.3'], { overrides: [{ measureId: '4.3.3', rule: 'R1', reason: 'r'.repeat(n), approver: 'Chief' }] })
    expect(mv(prescribe(cat, confirmed('S01'), mk(19)), '4.3.3')).toBe('CONTRAINDICATED')
    expect(mv(prescribe(cat, confirmed('S01'), mk(20)), '4.3.3')).toBe('ALLOWED_BY_OVERRIDE')
  })
})

describe('LLM cannot own a verdict', () => {
  it('a diagnosis built only from accepted proposals never yields CONFIRMED', () => {
    const proposals = (['S01', 'S02', 'S03', 'S04'] as const).flatMap((s) =>
      Array.from({ length: 5 }, (_, i) => ({ stressor: s, quote: `q${i}`, checkupId: `c${i}` })),
    )
    const d = diagnose(cat, [], items, readingRules, proposals)
    for (const s of cat.stressors) expect(d[s.id].status).not.toBe('CONFIRMED')
  })

  it('100 proposals for one stressor still SUSPECTED, so the barrier promotion cannot fire', () => {
    const proposals = Array.from({ length: 100 }, (_, i) => ({ stressor: 'S02' as const, quote: `q${i}`, checkupId: `c${i}` }))
    const d = diagnose(cat, [], items, readingRules, proposals)
    expect(d.S02.status).toBe('SUSPECTED')
    expect(mv(prescribe(cat, d, planOf(['4.3.1'])), '4.3.1')).toBe('INDICATED') // R1: nothing uncovered, so not blocked either
    const d2 = diagnose(cat, [checkup('c', { readings: { RR1: 1 } })], items, readingRules, proposals)
    expect(d2.S02.status).toBe('SUSPECTED')
    expect(prescribe(cat, d2, planOf(['4.3.1'])).measures[0]!.verdict).toBe('CONTRAINDICATED')
  })
})

describe('determinism', () => {
  it('the full pipeline gives byte-identical output twice', () => {
    const run = () => {
      const cs = [
        checkup('c1', { answers: { I1: 'yes' } }),
        checkup('c2', { observer: 'obs-b', answers: { I1: 'yes', I2: 'yes' } }),
        ...baciCheckups({ n: 6, impactShift: 2, controlShift: 0 }),
      ]
      const d = diagnose(cat, cs, items, readingRules, [])
      const p = planOf(['4.2.2', '4.3.3'])
      p.measures[0]!.implementedOn = '2027-06-01'
      return JSON.stringify([d, prescribe(cat, d, p), followup(cat, p, cs, '2027-12-15'), outcome(cat, p, '4.2.2', 'IND1', cs, '2027-12-15')])
    }
    expect(run()).toBe(run())
  })
})

describe('mutation checks: each control depends on its rule', () => {
  it('R1: disabling it un-contraindicates re-meandering', () => {
    const p = planOf(['4.3.3'])
    expect(mv(prescribe(cat, confirmed('S01'), p), '4.3.3')).toBe('CONTRAINDICATED')
    expect(mv(prescribe(cat, confirmed('S01'), p, off('R1')), '4.3.3')).toBe('INDICATED')
    expect(prescribe(cat, confirmed('S01'), p, off('R1')).verdict).not.toBe('BLOCKED')
  })

  it('R2: disabling it removes the barrier promotion', () => {
    const p = planOf(['4.3.1'])
    expect(mv(prescribe(cat, confirmed('S01', 'S02'), p), '4.3.1')).toBe('INDICATED')
    expect(mv(prescribe(cat, confirmed('S01', 'S02'), p, off('R2')), '4.3.1')).toBe('CONTRAINDICATED')
  })

  it('R3: disabling it lets symptom-only treatment through', () => {
    const p = planOf(['4.5.1'])
    expect(mv(prescribe(cat, confirmed('S01'), p), '4.5.1')).toBe('SYMPTOM_ONLY')
    expect(mv(prescribe(cat, confirmed('S01'), p, off('R3')), '4.5.1')).toBe('INDICATED')
  })

  it('R4: disabling it un-defers a compensatory measure', () => {
    const p = planOf(['4.6.1'])
    expect(mv(prescribe(cat, confirmed('S04'), p), '4.6.1')).toBe('DEFERRED')
    expect(mv(prescribe(cat, confirmed('S04'), p, off('R4')), '4.6.1')).toBe('INDICATED')
  })

  it('R5: disabling it makes an empty plan SIGNABLE', () => {
    expect(prescribe(cat, confirmed('S04'), planOf([])).verdict).toBe('INCOMPLETE')
    expect(prescribe(cat, confirmed('S04'), planOf([]), off('R5')).verdict).toBe('SIGNABLE')
  })

  it('R6: disabling it makes a plan without SMART objectives SIGNABLE', () => {
    const p: Plan = { ...planOf([]), measures: [{ measureId: '4.4.1' }] }
    expect(prescribe(cat, confirmed('S04'), p).verdict).toBe('INCOMPLETE')
    expect(prescribe(cat, confirmed('S04'), p, off('R6')).verdict).toBe('SIGNABLE')
  })

  const built = (): Plan => {
    const p = planOf([])
    p.measures = [place('4.2.2', { implementedOn: '2027-06-01' })]
    return p
  }

  it('R7: disabling it lets a too-early verdict through', () => {
    const cs = baciCheckups({ n: 6, impactShift: 2, controlShift: 0 })
    expect(outcome(cat, built(), '4.2.2', 'IND1', cs, '2027-10-15').verdict).toBe('NOT_YET_KNOWABLE')
    expect(outcome(cat, built(), '4.2.2', 'IND1', cs, '2027-10-15', off('R7')).verdict).toBe('IMPROVED')
  })

  it('R8: disabling it removes both the CONFOUNDED test and the min-cell check', () => {
    const conf = baciCheckups({ n: 6, impactShift: 2, controlShift: 2 })
    expect(outcome(cat, built(), '4.2.2', 'IND1', conf, '2027-12-15').verdict).toBe('CONFOUNDED')
    expect(outcome(cat, built(), '4.2.2', 'IND1', conf, '2027-12-15', off('R8')).verdict).not.toBe('CONFOUNDED')
    const thin = baciCheckups({ n: { bi: 6, ai: 2, bc: 6, ac: 6 }, impactShift: 2, controlShift: 0 })
    expect(outcome(cat, built(), '4.2.2', 'IND1', thin, '2027-12-15').verdict).toBe('NOT_YET_KNOWABLE')
    expect(outcome(cat, built(), '4.2.2', 'IND1', thin, '2027-12-15', off('R8')).verdict).not.toBe('NOT_YET_KNOWABLE')
  })
})

describe('every verdict has reasons, and each reason comes from the catalogue', () => {
  it('holds across a sweep of scenarios', () => {
    const reasons: Reason[] = []
    const diags = [confirmed(), confirmed('S01'), confirmed('S01', 'S02'), confirmed('S01', 'S03', 'S04')]
    const plans = [[], ['4.3.3'], ['4.2.2', '4.3.3'], ['4.5.1'], ['4.6.1', '4.4.1'], ['4.3.1']]
    for (const d of diags) {
      for (const ids of plans) {
        const a = prescribe(cat, d, planOf(ids))
        expect(a.reasons.length).toBeGreaterThanOrEqual(1)
        reasons.push(...a.reasons)
        for (const m of a.measures) {
          expect(m.reasons.length).toBeGreaterThanOrEqual(1)
          reasons.push(...m.reasons)
        }
      }
    }
    for (const it0 of followup(cat, planOf(['4.2.2', '4.1.1']), [], '2027-12-15').items) reasons.push(...it0.reasons)
    expect(reasons.length).toBeGreaterThan(20)
    for (const r of reasons) {
      const def = cat.rules.find((x) => x.id === r.rule)
      expect(def).toBeDefined()
      expect(r.page).toBe(def!.page)
      expect(r.quote).toBe(def!.quote)
    }
  })
})
