import { describe, it, expect, beforeAll } from 'vitest'
import { scenarioBundle, validateBundle, getValidator } from '../../scripts/validate-fhir'
import { fromBundle, toBundle } from '../fhir'
import type { FhirBundle } from '../fhir'
import { catalogue, checkupItems, readingRuleSet } from '../catalogue'
import { scenario } from '../scenario'
import { diagnose, prescribe, outcome } from '../index'

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T
const of = (b: FhirBundle, type: string) => b.entry.map((e) => e.resource).filter((r) => r.resourceType === type)

describe('FHIR export', () => {
  beforeAll(async () => {
    await getValidator()
  }, 120_000)

  const first = scenarioBundle('firstline')
  const naive = scenarioBundle('naive')

  it('firstline and naive bundles validate structurally (R4 schema + reference checks)', async () => {
    expect(await validateBundle(first)).toEqual([])
    expect(await validateBundle(naive)).toEqual([])
  })

  it('the naive plan carries a DetectedIssue for R1 with the D2.4 p.19 cite, implicating the CarePlan', () => {
    const issues = of(naive, 'DetectedIssue') as any[]
    const r1 = issues.find((i) => i.code.coding[0].code === 'R1')
    expect(r1).toBeTruthy()
    expect(r1.detail).toContain('D2.4 p.19')
    expect(r1.implicated[0].reference).toMatch(/^CarePlan\//)
  })

  it('a signed override becomes a DetectedIssue mitigation with author and reason', () => {
    const dx = diagnose(catalogue, scenario.checkups.filter((c) => c.date < scenario.diagnosisCutoff), checkupItems, readingRuleSet, [])
    const plan = { ...scenario.plans.naive, overrides: [{ measureId: '4.3.3', rule: 'R1' as const, reason: 'Urban constraint requires parallel delivery here.', approver: 'A. Officer' }] }
    const b = toBundle({ catalogue, plan, assessment: prescribe(catalogue, dx, plan), diagnosis: dx, checkups: [], reaches: scenario.reaches, outcomes: [], exportedAt: '2026-09-29T00:00:00Z' })
    const di = (of(b, 'DetectedIssue') as any[])[0]
    expect(di.mitigation[0].author.display).toBe('A. Officer')
    expect(di.mitigation[0].action.text).toContain('parallel delivery')
  })

  it('is deterministic: byte-identical twice', () => {
    expect(JSON.stringify(scenarioBundle('firstline'))).toBe(JSON.stringify(first))
  })

  it('round-trips measure codes, stressor codes and outcome verdicts back to the source', () => {
    const dx = diagnose(catalogue, scenario.checkups.filter((c) => c.date < scenario.diagnosisCutoff), checkupItems, readingRuleSet, [])
    const back = fromBundle(first)
    const plan = scenario.plans.firstline
    expect(back.measureCodes).toEqual(plan.measures.map((m) => m.measureId).sort())
    const expectedStressors = catalogue.stressors
      .filter((s) => dx[s.id].status !== 'NOT_ASSESSED')
      .map((s) => ({ code: s.id, status: dx[s.id].status }))
      .sort((a, b) => (a.code < b.code ? -1 : 1))
    expect(back.stressors).toEqual(expectedStressors)
    const src = [['4.2.2', 'odour'], ['4.2.2', 'clarity'], ['4.2.2', 'algae'], ['4.1.1', 'riparian-cover']]
      .map(([m, i]) => ({ measureId: m!, indicator: i!, verdict: outcome(catalogue, plan, m!, i!, scenario.checkups, scenario.asOf).verdict }))
      .sort((a, b) => ((a.measureId + a.indicator) < (b.measureId + b.indicator) ? -1 : 1))
    expect(back.outcomes).toEqual(src)
    expect(back.outcomes.map((o) => o.verdict)).toEqual(expect.arrayContaining(['IMPROVED', 'NOT_YET_KNOWABLE']))
  })

  it('NOT_ASSESSED stressors are absent as Conditions and named in the CarePlan note', () => {
    const codes = (of(first, 'Condition') as any[]).map((c) => c.code.coding[0].code)
    const dx = diagnose(catalogue, scenario.checkups.filter((c) => c.date < scenario.diagnosisCutoff), checkupItems, readingRuleSet, [])
    const na = catalogue.stressors.filter((s) => dx[s.id].status === 'NOT_ASSESSED').map((s) => s.id)
    expect(na.length).toBeGreaterThan(0)
    for (const s of na) {
      expect(codes).not.toContain(s)
      expect((of(first, 'CarePlan')[0] as any).note[0].text).toContain(s)
    }
  })

  it('scenario check-ups carry the scenario provenance tag; Location links are the subject', () => {
    const obs = (of(first, 'Observation') as any[]).filter((o) => o.code.coding[0].code === 'citizen-checkup')
    expect(obs).toHaveLength(scenario.checkups.length)
    for (const o of obs) {
      expect(o.meta.tag[0].code).toBe('scenario')
      expect(o.subject.reference).toMatch(/^Location\//)
    }
    const loc = of(first, 'Location')[0] as any
    expect(loc.meta.profile[0]).toBe('http://hl7.eu/fhir/ig/oah/StructureDefinition/location-oah')
  })

  it('PLANTED BAD (dangling reference) must FAIL the validator', async () => {
    const bad = clone(first)
    ;(of(bad, 'Observation')[0] as any).subject = { reference: 'Location/nowhere' }
    const errs = await validateBundle(bad)
    expect(errs.some((e) => e.includes('dangling reference Location/nowhere'))).toBe(true)
  })

  it('PLANTED BAD (schema violation) must FAIL the validator, so the schema is actually applied', async () => {
    const bad = clone(first)
    ;(of(bad, 'Condition')[0] as any).clinicalStatus = 'active' // must be a CodeableConcept
    expect((await validateBundle(bad)).length).toBeGreaterThan(0)
    const bad2 = clone(first) as any
    bad2.type = 'not-a-bundle-type'
    expect((await validateBundle(bad2)).length).toBeGreaterThan(0)
  })

  it('PLANTED BAD (Condition subject a Location) must FAIL the R4 subject rule', async () => {
    const bad = clone(first)
    ;(of(bad, 'Condition')[0] as any).subject = { reference: (of(bad, 'Location')[0] as any).resourceType + '/' + (of(bad, 'Location')[0] as any).id }
    expect((await validateBundle(bad)).some((e) => e.includes('not Patient/Group'))).toBe(true)
  })
})
