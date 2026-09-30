/**
 * FHIR R4 export. Pure and deterministic: no clock (exportedAt is passed in), no randomness, ids derive from plan,
 * measure, stressor and check-up ids. Emits a Bundle of type "collection".
 *
 * SUBJECT PATTERN (DECISIONS.md 2026-09-29, FHIR subject): the OneAquaHealth IG models a stream reach as a `Location`
 * (profile location-oah) and points Observation.subject at it. It defines nothing for Condition/CarePlan/Goal, whose R4
 * subject can only be Patient or Group (Goal also Organization). So the ecosystem subject is a definitional
 * `Group` (actual=false, no members) whose `characteristic` references the Location. Observations point at the Location
 * directly, as the IG does.
 */
import type { Catalogue, Checkup, Diagnosis, OutcomeResult, Plan, PlanAssessment, Reason, StressorId } from './types'
import type { Reach } from './scenario'

export const FHIR_BASE = 'https://firstline.example'
export const CS = {
  stressor: `${FHIR_BASE}/CodeSystem/stressor`,
  measure: `${FHIR_BASE}/CodeSystem/measure`,
  rule: `${FHIR_BASE}/CodeSystem/rule`,
  indicator: `${FHIR_BASE}/CodeSystem/indicator`,
  outcome: `${FHIR_BASE}/CodeSystem/outcome`,
  verdict: `${FHIR_BASE}/CodeSystem/outcome-verdict`,
  outcomeComponent: `${FHIR_BASE}/CodeSystem/outcome-component`,
  checkup: `${FHIR_BASE}/CodeSystem/checkup`,
  checkupItem: `${FHIR_BASE}/CodeSystem/checkup-item`,
  reading: `${FHIR_BASE}/CodeSystem/reading`,
  provenance: `${FHIR_BASE}/CodeSystem/provenance`,
  ecosystem: `${FHIR_BASE}/CodeSystem/ecosystem-subject`,
} as const
/** From the OAH IG's sushi-config.yaml (canonical) and profiles/location-oah.fsh (Id). Read 2026-09-29. */
export const OAH_LOCATION_PROFILE = 'http://hl7.eu/fhir/ig/oah/StructureDefinition/location-oah'
/** Identifier system and the SNOMED "River" type code used in the OAH IG's own Location examples. */
export const OAH_LOCATION_ID_SYSTEM = 'https://oneaquahealth.eu/location-id'
/**
 * Group.type has a required binding: person | animal | practitioner | device | medication | substance.
 * None means "ecosystem". `animal` is the least wrong: the reach's aquatic biota is the thing the stressors act on, and
 * the Group is definitional (actual=false) so it claims no members. One constant, so the owner can flip it.
 */
export const ECOSYSTEM_GROUP_TYPE = 'animal'

export interface FhirInput {
  catalogue: Catalogue
  plan: Plan
  assessment: PlanAssessment
  diagnosis: Diagnosis
  checkups: Checkup[]
  reaches: Reach[]
  outcomes: OutcomeResult[]
  /** ISO instant, passed in (the engine has no clock). */
  exportedAt: string
}

export interface FhirResource {
  resourceType: string
  id: string
  [k: string]: unknown
}
export interface FhirBundle {
  resourceType: 'Bundle'
  id: string
  type: 'collection'
  timestamp: string
  entry: { fullUrl: string; resource: FhirResource }[]
}

const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)
const idPart = (s: string): string => s.replace(/[^A-Za-z0-9.-]/g, '-')
const ref = (type: string, id: string): { reference: string } => ({ reference: `${type}/${id}` })
const coding = (system: string, code: string, display?: string) => ({ system, code, ...(display ? { display } : {}) })
const cc = (system: string, code: string, display?: string) => ({ coding: [coding(system, code, display)], ...(display ? { text: display } : {}) })
const tag = (provenance: 'field' | 'scenario') => ({
  tag: [
    coding(CS.provenance, provenance, provenance === 'scenario' ? 'Scenario · not field records' : 'Field record'),
  ],
})

export const ids = {
  location: (reachId: string) => `loc-${idPart(reachId)}`,
  group: (reachId: string) => `grp-${idPart(reachId)}`,
  condition: (s: StressorId) => `cnd-${s}`,
  carePlan: (planId: string) => `cp-${idPart(planId)}`,
  goal: (planId: string, measureId: string) => `goal-${idPart(planId)}-${idPart(measureId)}`,
  issue: (planId: string, n: number) => `di-${idPart(planId)}-${String(n).padStart(2, '0')}`,
  checkup: (id: string) => `obs-${idPart(id)}`,
  outcome: (planId: string, measureId: string, indicator: string) =>
    `out-${idPart(planId)}-${idPart(measureId)}-${idPart(indicator)}`,
}

function reasonDetail(r: Reason, measureId?: string): string {
  const instead = r.instead && r.instead.length > 0 ? ` Consider instead: ${r.instead.join(', ')}.` : ''
  return `${measureId ? `[${measureId}] ` : ''}${r.plain}${instead} D2.4 p.${r.page}`
}

function codeSystems(cat: Catalogue): FhirResource[] {
  const cs = (id: string, url: string, name: string, concepts: { code: string; display: string }[]): FhirResource => ({
    resourceType: 'CodeSystem',
    id,
    url,
    name,
    status: 'draft',
    content: 'complete',
    caseSensitive: true,
    count: concepts.length,
    concept: concepts,
  })
  return [
    cs('stressor', CS.stressor, 'FirstlineStressor', [...cat.stressors].sort((a, b) => cmp(a.id, b.id)).map((s) => ({ code: s.id, display: s.name }))),
    cs('measure', CS.measure, 'FirstlineMeasure', [...cat.measures].sort((a, b) => cmp(a.id, b.id)).map((m) => ({ code: m.id, display: m.name }))),
  ]
}

/** Build the bundle. Same input, same bytes. */
export function toBundle(input: FhirInput): FhirBundle {
  const { catalogue: cat, plan, assessment, diagnosis, exportedAt } = input
  const today = exportedAt.slice(0, 10)
  const reachById = new Map(input.reaches.map((r) => [r.id, r]))
  const impact = reachById.get(plan.impactReachId)
  if (!impact) throw new Error(`plan impact reach not in reaches: ${plan.impactReachId}`)
  const checkups = input.checkups.filter((c) => reachById.has(c.reachId)).sort((a, b) => cmp(a.id, b.id))
  const checkupIds = new Set(checkups.map((c) => c.id))
  const subjectRef = (): { reference: string } => ref('Group', ids.group(impact.id))
  const res: FhirResource[] = []

  // Local code systems (the terminology the codes below point at).
  res.push(...codeSystems(cat))

  // Locations + the ecosystem subject Groups.
  const usedReaches = [...reachById.values()].sort((a, b) => cmp(a.id, b.id))
  for (const r of usedReaches) {
    const scenario = checkups.some((c) => c.reachId === r.id && c.provenance === 'scenario')
    res.push({
      resourceType: 'Location',
      id: ids.location(r.id),
      meta: { profile: [OAH_LOCATION_PROFILE], ...tag(scenario ? 'scenario' : 'field') },
      identifier: [{ system: OAH_LOCATION_ID_SYSTEM, value: r.id }],
      status: 'active',
      name: r.name,
      description: `${r.role} reach`,
      mode: 'instance',
      type: [{ coding: [coding('http://snomed.info/sct', '420531007', 'River')] }],
      position: { longitude: r.lon, latitude: r.lat },
    })
    res.push({
      resourceType: 'Group',
      id: ids.group(r.id),
      type: ECOSYSTEM_GROUP_TYPE,
      actual: false,
      name: `Ecosystem subject: ${r.name}`,
      characteristic: [
        { code: cc(CS.ecosystem, 'reach-location', 'Stream reach (Location)'), valueReference: ref('Location', ids.location(r.id)), exclude: false },
      ],
    })
  }

  // Stressors -> Condition. NOT_ASSESSED is not emitted (listed in the CarePlan note).
  const emitted: StressorId[] = []
  const notAssessed: StressorId[] = []
  for (const s of [...cat.stressors].sort((a, b) => cmp(a.id, b.id))) {
    const d = diagnosis[s.id]
    if (!d || d.status === 'NOT_ASSESSED') {
      notAssessed.push(s.id)
      continue
    }
    emitted.push(s.id)
    const evidenceIds = [...new Set(d.evidence.map((e) => e.checkupId))].filter((id) => checkupIds.has(id)).sort(cmp)
    res.push({
      resourceType: 'Condition',
      id: ids.condition(s.id),
      clinicalStatus: { coding: [coding('http://terminology.hl7.org/CodeSystem/condition-clinical', 'active')] },
      verificationStatus: {
        coding: [
          coding(
            'http://terminology.hl7.org/CodeSystem/condition-ver-status',
            d.status === 'CONFIRMED' ? 'confirmed' : 'provisional',
          ),
        ],
      },
      category: [{ coding: [coding('http://terminology.hl7.org/CodeSystem/condition-category', 'problem-list-item')] }],
      code: cc(CS.stressor, s.id, s.name),
      subject: subjectRef(),
      ...(evidenceIds.length > 0 ? { evidence: [{ detail: evidenceIds.map((id) => ref('Observation', ids.checkup(id))) }] } : {}),
      note: [{ text: `Status ${d.status} (engine verdict). D2.4 p.${s.page}.${d.settleWith.length ? ` Would settle: ${d.settleWith.join(', ')}.` : ''}` }],
    })
  }
  const emittedSet = new Set<string>(emitted)

  // Goals (SMART objectives).
  const goalRefs: Record<string, { reference: string }> = {}
  for (const p of [...plan.measures].sort((a, b) => cmp(a.measureId, b.measureId))) {
    if (!p.objective) continue
    const m = cat.measures.find((x) => x.id === p.measureId)
    const ind = cat.indicators.find((i) => i.id === p.objective!.indicator)
    const gid = ids.goal(plan.id, p.measureId)
    goalRefs[p.measureId] = ref('Goal', gid)
    res.push({
      resourceType: 'Goal',
      id: gid,
      lifecycleStatus: p.implementedOn && p.implementedOn <= today ? 'active' : 'planned',
      description: { text: p.objective.specific },
      subject: subjectRef(),
      target: [
        {
          measure: cc(CS.indicator, p.objective.indicator, ind?.name),
          detailQuantity: { value: p.objective.measurable, unit: 'scale units (higher is better)' },
          dueDate: p.objective.timeBound,
        },
      ],
      addresses: (m?.addresses ?? []).filter((s) => emittedSet.has(s)).sort(cmp).map((s) => ref('Condition', ids.condition(s))),
    })
  }

  // CarePlan.
  const cpId = ids.carePlan(plan.id)
  const addressed = [...new Set(plan.measures.flatMap((p) => cat.measures.find((m) => m.id === p.measureId)?.addresses ?? []))]
    .filter((s) => emittedSet.has(s))
    .sort(cmp)
  const verdictOf = new Map(assessment.measures.map((m) => [m.measureId, m.verdict]))
  res.push({
    resourceType: 'CarePlan',
    id: cpId,
    status: assessment.verdict === 'SIGNABLE' ? 'active' : 'draft',
    intent: 'plan',
    title: plan.name,
    description: `Plan verdict ${assessment.verdict} (engine). ${assessment.reasons.map((r) => reasonDetail(r)).join(' ')}`,
    subject: subjectRef(),
    created: exportedAt,
    addresses: addressed.map((s) => ref('Condition', ids.condition(s))),
    goal: Object.keys(goalRefs).sort(cmp).map((k) => goalRefs[k]!),
    activity: [...plan.measures]
      .sort((a, b) => cmp(a.measureId, b.measureId))
      .map((p) => {
        const m = cat.measures.find((x) => x.id === p.measureId)
        return {
          detail: {
            kind: 'ServiceRequest',
            code: cc(CS.measure, p.measureId, m?.name),
            status: p.implementedOn ? (p.implementedOn <= today ? 'in-progress' : 'scheduled') : 'not-started',
            ...(goalRefs[p.measureId] ? { goal: [goalRefs[p.measureId]] } : {}),
            ...(p.objective || p.implementedOn
              ? { scheduledPeriod: { ...(p.implementedOn ? { start: p.implementedOn } : {}), ...(p.objective ? { end: p.objective.timeBound } : {}) } }
              : {}),
            description: `${m?.name ?? p.measureId}: ${verdictOf.get(p.measureId) ?? 'UNASSESSED'}`,
          },
        }
      }),
    note: [
      {
        text: `NOT_ASSESSED stressors, not emitted as Condition: ${notAssessed.length ? notAssessed.join(', ') : 'none'}.`,
      },
    ],
  })

  // Refusals and overrides -> DetectedIssue.
  let n = 0
  const issue = (r: Reason, severity: string, measureId?: string, override?: { approver: string; reason: string }): FhirResource => {
    n += 1
    return {
      resourceType: 'DetectedIssue',
      id: ids.issue(plan.id, n),
      status: 'final',
      severity,
      code: cc(CS.rule, r.rule, cat.rules.find((x) => x.id === r.rule)?.name),
      identifiedDateTime: exportedAt,
      detail: reasonDetail(r, measureId),
      implicated: [ref('CarePlan', cpId)],
      ...(override
        ? {
            mitigation: [
              {
                action: { coding: [coding(CS.rule, 'override', 'Signed override')], text: override.reason },
                date: exportedAt,
                author: { display: override.approver },
              },
            ],
          }
        : {}),
    }
  }
  for (const m of assessment.measures) {
    if (m.verdict === 'INDICATED') continue
    const ov = m.verdict === 'ALLOWED_BY_OVERRIDE' ? assessment.overridden.find((o) => o.measureId === m.measureId) : undefined
    const sev = m.verdict === 'CONTRAINDICATED' ? 'high' : m.verdict === 'ALLOWED_BY_OVERRIDE' ? 'low' : 'moderate'
    for (const r of m.reasons) res.push(issue(r, sev, m.measureId, ov ? { approver: ov.approver.trim(), reason: ov.reason.trim() } : undefined))
  }
  if (assessment.verdict === 'INCOMPLETE') for (const r of assessment.reasons) res.push(issue(r, 'moderate'))

  // Check-ups -> Observation (subject = Location).
  for (const c of checkups) {
    const comps: unknown[] = [
      ...Object.keys(c.indicators ?? {}).sort(cmp).map((k) => ({ code: cc(CS.indicator, k), valueQuantity: { value: c.indicators![k], unit: 'ordinal class' } })),
      ...Object.keys(c.answers).sort(cmp).map((k) => ({ code: cc(CS.checkupItem, k), valueString: c.answers[k] })),
      ...Object.keys(c.readings ?? {}).sort(cmp).map((k) => ({ code: cc(CS.reading, k), valueQuantity: { value: c.readings![k] } })),
    ]
    res.push({
      resourceType: 'Observation',
      id: ids.checkup(c.id),
      meta: tag(c.provenance),
      status: 'final',
      category: [{ coding: [coding('http://terminology.hl7.org/CodeSystem/observation-category', 'survey')] }],
      code: cc(CS.checkup, 'citizen-checkup', 'Citizen check-up'),
      subject: ref('Location', ids.location(c.reachId)),
      effectiveDateTime: c.date,
      performer: [{ display: c.observer }],
      ...(c.note ? { note: [{ text: c.note }] } : {}),
      ...(comps.length ? { component: comps } : {}),
    })
  }

  // Outcomes -> Observation (category survey, code outcome).
  for (const o of [...input.outcomes].sort((a, b) => cmp(ids.outcome(plan.id, a.measureId, a.indicator), ids.outcome(plan.id, b.measureId, b.indicator)))) {
    const q = (code: string, value: number) => ({ code: cc(CS.outcomeComponent, code), valueQuantity: { value } })
    const comps: unknown[] = [
      { code: cc(CS.outcomeComponent, 'measure'), valueCodeableConcept: cc(CS.measure, o.measureId) },
      { code: cc(CS.outcomeComponent, 'indicator'), valueCodeableConcept: cc(CS.indicator, o.indicator) },
      { code: cc(CS.outcomeComponent, 'design'), valueString: o.design },
      q('delta', o.delta),
      ...(o.contrast !== undefined ? [q('contrast', o.contrast)] : []),
      ...(o.ci ? [q('ci-low', o.ci.low), q('ci-high', o.ci.high), q('ci-level', o.ci.level)] : []),
      { code: cc(CS.outcomeComponent, 'n-before-impact'), valueInteger: o.cells.beforeImpact.n },
      { code: cc(CS.outcomeComponent, 'n-after-impact'), valueInteger: o.cells.afterImpact.n },
      ...(o.cells.beforeControl ? [{ code: cc(CS.outcomeComponent, 'n-before-control'), valueInteger: o.cells.beforeControl.n }] : []),
      ...(o.cells.afterControl ? [{ code: cc(CS.outcomeComponent, 'n-after-control'), valueInteger: o.cells.afterControl.n }] : []),
      ...(o.knowableFrom ? [{ code: cc(CS.outcomeComponent, 'knowable-from'), valueString: o.knowableFrom }] : []),
      ...(o.visitsNeeded !== undefined ? [{ code: cc(CS.outcomeComponent, 'visits-needed'), valueInteger: o.visitsNeeded }] : []),
    ]
    res.push({
      resourceType: 'Observation',
      id: ids.outcome(plan.id, o.measureId, o.indicator),
      status: 'final',
      category: [{ coding: [coding('http://terminology.hl7.org/CodeSystem/observation-category', 'survey')] }],
      code: cc(CS.outcome, 'outcome', 'Firstline outcome verdict'),
      subject: ref('Location', ids.location(impact.id)),
      focus: [ref('CarePlan', cpId)],
      effectiveDateTime: exportedAt,
      valueCodeableConcept: cc(CS.verdict, o.verdict, o.verdict),
      note: [{ text: o.reasons.map((r) => reasonDetail(r)).join(' ') }],
      component: comps,
    })
  }

  return {
    resourceType: 'Bundle',
    id: `firstline-${idPart(plan.id)}`,
    type: 'collection',
    timestamp: exportedAt,
    entry: res.map((resource) => ({ fullUrl: `${FHIR_BASE}/${resource.resourceType}/${resource.id}`, resource })),
  }
}

/** Read back what the bundle asserts: measure codes, stressor codes with status, outcome verdicts. Used by the round-trip test. */
export function fromBundle(b: FhirBundle): {
  measureCodes: string[]
  stressors: { code: string; status: 'CONFIRMED' | 'SUSPECTED' }[]
  outcomes: { measureId: string; indicator: string; verdict: string }[]
  issueRules: string[]
} {
  const rs = b.entry.map((e) => e.resource)
  const codeOf = (x: any): string => x?.coding?.[0]?.code
  const compCode = (r: any, code: string): any => (r.component as any[]).find((c) => codeOf(c.code) === code)
  return {
    measureCodes: rs.filter((r) => r.resourceType === 'CarePlan').flatMap((r: any) => r.activity.map((a: any) => codeOf(a.detail.code))).sort(cmp),
    stressors: rs
      .filter((r) => r.resourceType === 'Condition')
      .map((r: any) => ({ code: codeOf(r.code), status: codeOf(r.verificationStatus) === 'confirmed' ? ('CONFIRMED' as const) : ('SUSPECTED' as const) }))
      .sort((a, b) => cmp(a.code, b.code)),
    outcomes: rs
      .filter((r: any) => r.resourceType === 'Observation' && codeOf(r.code) === 'outcome')
      .map((r: any) => ({
        measureId: codeOf(compCode(r, 'measure').valueCodeableConcept),
        indicator: codeOf(compCode(r, 'indicator').valueCodeableConcept),
        verdict: codeOf(r.valueCodeableConcept),
      }))
      .sort((a, b) => cmp(a.measureId + a.indicator, b.measureId + b.indicator)),
    issueRules: rs.filter((r) => r.resourceType === 'DetectedIssue').map((r: any) => codeOf(r.code)).sort(cmp),
  }
}
