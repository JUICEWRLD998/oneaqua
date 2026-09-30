import { describe, it, expect } from 'vitest'
import { prescribe } from '../prescribe'
import type { Line } from '../types'
import { cat, confirmed, diagnosisOf, planOf, place, validInfeasibility, goodObjective } from './fixtures'

const verdictOf = (a: ReturnType<typeof prescribe>, id: string) => a.measures.find((m) => m.measureId === id)!

describe('prescribe: measure verdicts', () => {
  it('R1: L2 with an uncovered first-line stressor is CONTRAINDICATED with L1 alternatives', () => {
    const a = prescribe(cat, confirmed('S01'), planOf(['4.3.3']))
    const m = verdictOf(a, '4.3.3')
    expect(m.verdict).toBe('CONTRAINDICATED')
    expect(m.reasons[0].rule).toBe('R1')
    expect(m.reasons[0].instead).toEqual(['4.2.2'])
    expect(a.verdict).toBe('BLOCKED')
    expect(a.uncovered).toEqual(['S01'])
    expect(a.reasons[0].rule).toBe('R1')
  })

  it('instead is sorted and covers all uncovered stressors', () => {
    const a = prescribe(cat, confirmed('S01', 'S03'), planOf(['4.3.3']))
    expect(verdictOf(a, '4.3.3').reasons[0].instead).toEqual(['4.1.1', '4.2.2', '4.7.1'])
  })

  it('sewer-first plan is not blocked and is SIGNABLE', () => {
    const a = prescribe(cat, confirmed('S01'), planOf(['4.2.2', '4.3.3']))
    expect(a.measures.every((m) => m.verdict !== 'CONTRAINDICATED')).toBe(true)
    expect(a.uncovered).toEqual([])
    expect(a.verdict).toBe('SIGNABLE')
    expect(a.reasons[0].rule).toBe('R1')
  })

  it('no confirmed first-line stressor: L2 is INDICATED', () => {
    const a = prescribe(cat, confirmed('S04'), planOf(['4.3.3', '4.4.1']))
    expect(verdictOf(a, '4.3.3').verdict).toBe('INDICATED')
    expect(a.verdict).toBe('SIGNABLE')
  })

  it('R3: invasive control alone with S01 confirmed is SYMPTOM_ONLY, with instead', () => {
    const a = prescribe(cat, confirmed('S01'), planOf(['4.5.1']))
    const m = verdictOf(a, '4.5.1')
    expect(m.verdict).toBe('SYMPTOM_ONLY')
    expect(m.reasons[0].rule).toBe('R3')
    expect(m.reasons[0].instead).toEqual(['4.2.2'])
    expect(a.verdict).toBe('INCOMPLETE')
  })

  it('R3: with nothing uncovered the same measure is INDICATED', () => {
    const a = prescribe(cat, confirmed('S01'), planOf(['4.2.2', '4.5.1']))
    expect(verdictOf(a, '4.5.1').verdict).toBe('INDICATED')
  })

  it('R4: compensatory without infeasibility is DEFERRED; with a valid record it is INDICATED', () => {
    const d = confirmed('S04')
    const bare = prescribe(cat, d, planOf(['4.6.1']))
    expect(verdictOf(bare, '4.6.1').verdict).toBe('DEFERRED')
    expect(verdictOf(bare, '4.6.1').reasons[0].rule).toBe('R4')
    const ok = prescribe(cat, d, { ...planOf([]), measures: [place('4.6.1', { infeasibility: validInfeasibility })] })
    expect(verdictOf(ok, '4.6.1').verdict).toBe('INDICATED')
    expect(verdictOf(ok, '4.6.1').reasons[0].rule).toBe('R4')
  })

  it('R4: short reason or blank approver is not a valid infeasibility', () => {
    const d = confirmed('S04')
    for (const inf of [
      { reason: 'too short', approver: 'A' },
      { reason: 'x'.repeat(19) + '   ', approver: 'A' },
      { reason: validInfeasibility.reason, approver: '  ' },
    ]) {
      const a = prescribe(cat, d, { ...planOf([]), measures: [place('4.6.1', { infeasibility: inf })] })
      expect(verdictOf(a, '4.6.1').verdict).toBe('DEFERRED')
    }
  })

  it('R2: barrier removal is promoted when S02 is confirmed, even with S01 uncovered', () => {
    const a = prescribe(cat, confirmed('S01', 'S02'), planOf(['4.3.1']))
    const m = verdictOf(a, '4.3.1')
    expect(m.verdict).toBe('INDICATED')
    expect(m.reasons[0].rule).toBe('R2')
    // a plan with only the barrier measure still leaves S01 uncovered: INCOMPLETE, not BLOCKED
    expect(a.verdict).toBe('INCOMPLETE')
  })

  it('R2: without S02 confirmed, a barrier measure falls under R1', () => {
    const a = prescribe(cat, confirmed('S01'), planOf(['4.3.1']))
    expect(verdictOf(a, '4.3.1').verdict).toBe('CONTRAINDICATED')
  })

  it('L3/L4 measures other than symptom ones are INDICATED with R1 (hierarchy respected)', () => {
    const a = prescribe(cat, confirmed('S01'), planOf(['4.2.2', '4.4.1']))
    expect(verdictOf(a, '4.4.1').verdict).toBe('INDICATED')
  })
})

describe('prescribe: overrides', () => {
  const base = () => planOf(['4.3.3'])
  it('a valid override flips to ALLOWED_BY_OVERRIDE and enters the ledger', () => {
    const ov = { measureId: '4.3.3', rule: 'R1' as const, reason: 'Sewer works are funded for 2028 already.', approver: 'Head of Water' }
    const a = prescribe(cat, confirmed('S01'), { ...base(), overrides: [ov] })
    const m = verdictOf(a, '4.3.3')
    expect(m.verdict).toBe('ALLOWED_BY_OVERRIDE')
    expect(m.reasons[0].rule).toBe('R1a')
    expect(m.reasons[0].plain).toContain('Head of Water')
    expect(m.reasons[0].plain).toContain(ov.reason)
    expect(a.overridden).toEqual([ov])
    expect(a.verdict).toBe('SIGNABLE') // 2026-09-30: a written R1a override waives package completeness; see DECISIONS.md
    expect(a.reasons[0].rule).toBe('R1a')
    expect(a.reasons[0].plain).toContain('S01')
    expect(a.reasons[0].plain).toContain('Head of Water')
  })

  it('controls: the waiver is only as wide as a VALID override (none BLOCKED, short reason BLOCKED, no SMART objective INCOMPLETE, empty plan INCOMPLETE)', () => {
    const ov = { measureId: '4.3.3', rule: 'R1' as const, reason: 'Sewer works are funded for 2028 already.', approver: 'Head of Water' }
    expect(prescribe(cat, confirmed('S01'), planOf(['4.3.3'])).verdict).toBe('BLOCKED')
    expect(prescribe(cat, confirmed('S01'), { ...planOf(['4.3.3']), overrides: [{ ...ov, reason: 'too short' }] }).verdict).toBe('BLOCKED')
    const noSmart = { ...planOf(['4.3.3']), overrides: [ov], measures: [{ measureId: '4.3.3' }] }
    const a = prescribe(cat, confirmed('S01'), noSmart)
    expect(a.verdict).toBe('INCOMPLETE')
    expect(a.reasons[0].rule).toBe('R6')
    expect(prescribe(cat, confirmed('S01'), { ...planOf([]), overrides: [ov] }).verdict).toBe('INCOMPLETE')
  })

  it('a 19-character reason is ignored', () => {
    const ov = { measureId: '4.3.3', rule: 'R1' as const, reason: 'a'.repeat(19), approver: 'X' }
    const a = prescribe(cat, confirmed('S01'), { ...base(), overrides: [ov] })
    expect(verdictOf(a, '4.3.3').verdict).toBe('CONTRAINDICATED')
    expect(a.overridden).toEqual([])
  })

  it('trimmed length counts and 20 is enough', () => {
    const pad = { measureId: '4.3.3', rule: 'R1' as const, reason: '   ' + 'a'.repeat(19) + '   ', approver: 'X' }
    expect(prescribe(cat, confirmed('S01'), { ...base(), overrides: [pad] }).overridden).toEqual([])
    const ok = { ...pad, reason: 'a'.repeat(20) }
    expect(prescribe(cat, confirmed('S01'), { ...base(), overrides: [ok] }).overridden).toEqual([ok])
  })

  it('a blank approver, wrong rule or other measure is ignored', () => {
    const r = 'a'.repeat(25)
    for (const ov of [
      { measureId: '4.3.3', rule: 'R1' as const, reason: r, approver: '  ' },
      { measureId: '4.3.3', rule: 'R3' as const, reason: r, approver: 'X' },
      { measureId: '4.3.2', rule: 'R1' as const, reason: r, approver: 'X' },
    ]) {
      const a = prescribe(cat, confirmed('S01'), { ...base(), overrides: [ov] })
      expect(verdictOf(a, '4.3.3').verdict).toBe('CONTRAINDICATED')
    }
  })
})

describe('prescribe: coverage and plan verdict', () => {
  it('L3 covers S03 (per-stressor r1AddressedBy) but not S01', () => {
    expect(prescribe(cat, confirmed('S03'), planOf(['4.4.1'])).uncovered).toEqual([])
    expect(prescribe(cat, confirmed('S01'), planOf(['4.4.1'])).uncovered).toEqual(['S01'])
  })

  it('a compensatory measure only covers a stressor if its line is listed AND infeasibility is valid', () => {
    const p = (inf?: typeof validInfeasibility) => ({ ...planOf([]), measures: [place('4.6.2', inf ? { infeasibility: inf } : {})] })
    // default list is L1 only: a C-* measure never covers
    expect(prescribe(cat, confirmed('S01'), p(validInfeasibility)).uncovered).toEqual(['S01'])
    const wide = { ...cat, params: { ...cat.params, r1AddressedBy: { ...cat.params.r1AddressedBy, S01: ['L1', 'C-chem'] as Line[] } } }
    expect(prescribe(wide, confirmed('S01'), p()).uncovered).toEqual(['S01'])
    expect(prescribe(wide, confirmed('S01'), p(validInfeasibility)).uncovered).toEqual([])
  })

  it('R5: an empty plan is INCOMPLETE', () => {
    const a = prescribe(cat, confirmed('S01'), planOf([]))
    expect(a.verdict).toBe('INCOMPLETE')
    expect(a.reasons.some((r) => r.rule === 'R5')).toBe(true)
  })

  it('R5: two confirmed stressors with a single measure is INCOMPLETE', () => {
    const a = prescribe(cat, confirmed('S04', 'S05'), planOf(['4.4.1']))
    expect(a.uncovered).toEqual([])
    expect(a.verdict).toBe('INCOMPLETE')
    expect(a.reasons[0].rule).toBe('R5')
    expect(prescribe(cat, confirmed('S04', 'S05'), planOf(['4.4.1', '4.3.3'])).verdict).toBe('SIGNABLE')
  })

  it('R5: uncovered stressors are named in the reason', () => {
    const a = prescribe(cat, confirmed('S01'), planOf(['4.4.1']))
    expect(a.verdict).toBe('INCOMPLETE')
    expect(a.reasons.find((r) => r.rule === 'R5')!.plain).toContain('S01')
  })

  it('R6: SMART objective checks', () => {
    const d = confirmed('S01')
    const withObj = (o: Partial<typeof goodObjective> | undefined) => ({
      ...planOf([]),
      measures: [{ measureId: '4.2.2', ...(o === undefined ? {} : { objective: { ...goodObjective, ...o } }) }],
    })
    expect(prescribe(cat, d, withObj({})).verdict).toBe('SIGNABLE')
    for (const bad of [undefined, { specific: '   ' }, { indicator: 'NOPE' }, { measurable: 0 }, { measurable: -1 }, { timeBound: '2028-02-30' }, { timeBound: 'soon' }]) {
      const a = prescribe(cat, d, withObj(bad))
      expect(a.verdict).toBe('INCOMPLETE')
      expect(a.reasons.some((r) => r.rule === 'R6')).toBe(true)
    }
  })

  it('precedence: BLOCKED beats INCOMPLETE', () => {
    const p = { ...planOf([]), measures: [{ measureId: '4.3.3' }] } // also lacks SMART
    expect(prescribe(cat, confirmed('S01'), p).verdict).toBe('BLOCKED')
  })

  it('throws on unknown and duplicate measure ids', () => {
    expect(() => prescribe(cat, confirmed(), planOf(['9.9.9']))).toThrow(/unknown/i)
    expect(() => prescribe(cat, confirmed(), planOf(['4.2.2', '4.2.2']))).toThrow(/duplicate/i)
  })

  it('a plan with nothing confirmed and a good measure is SIGNABLE', () => {
    expect(prescribe(cat, diagnosisOf({}), planOf(['4.4.1'])).verdict).toBe('SIGNABLE')
  })

  it('every verdict carries reasons from the catalogue', () => {
    const a = prescribe(cat, confirmed('S01', 'S02'), planOf(['4.3.3', '4.3.1', '4.5.1', '4.6.1']))
    for (const r of [...a.reasons, ...a.measures.flatMap((m) => m.reasons)]) {
      const def = cat.rules.find((x) => x.id === r.rule)!
      expect(r.page).toBe(def.page)
      expect(r.quote).toBe(def.quote)
    }
  })
})
