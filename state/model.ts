/**
 * Client-side app state for Firstline. Pure functions over the engine: no I/O, no clock (asOf is state).
 * The engine owns every verdict; this layer only builds plans, defaults and derived views.
 */
import { catalogue, checkupItems, readingRuleSet } from '../engine/catalogue'
import { scenario } from '../engine/scenario'
import { diagnose, prescribe, followup, outcome, addDays } from '../engine/index'
import type {
  AcceptedProposal, Checkup, Diagnosis, Followup, Measure, MeasureId, OutcomeResult, Override, PlacedMeasure,
  Plan, PlanAssessment, RuleId, SmartObjective,
} from '../engine/types'

export type Variant = 'base' | 'controlMoved'

export interface AppState {
  plan: Plan
  variant: Variant
  asOf: string
  acceptedProposals: AcceptedProposal[]
}

const measureById = new Map(catalogue.measures.map((m) => [m.id, m]))
export const getMeasure = (id: MeasureId): Measure | undefined => measureById.get(id)

/** SMART defaults so a freshly placed measure is never an unexplained INCOMPLETE. The officer can edit every field. */
export function defaultObjective(m: Measure, asOf: string): SmartObjective {
  const indicator =
    m.citizenMonitorable.find((i) => catalogue.indicators.some((x) => x.id === i && x.citizenObservable)) ?? catalogue.indicators[0]!.id
  const lagDays = m.establishmentYears ? m.establishmentYears * 365 : catalogue.params.r7LagDays[m.responseLag].days
  return {
    specific: `Improve ${catalogue.indicators.find((x) => x.id === indicator)?.name ?? indicator} on the impact reach (${m.name})`,
    indicator,
    measurable: 1,
    timeBound: addDays(asOf, lagDays),
  }
}

export function initialState(which: 'firstline' | 'naive' | 'empty' = 'firstline'): AppState {
  const base: Plan =
    which === 'empty'
      ? { ...structuredClone(scenario.plans.firstline), id: 'my-plan', name: 'My plan', measures: [], overrides: [] }
      : structuredClone(scenario.plans[which])
  return { plan: base, variant: 'base', asOf: scenario.asOf, acceptedProposals: [] }
}

export function placeMeasure(s: AppState, id: MeasureId): AppState {
  const m = getMeasure(id)
  if (!m || s.plan.measures.some((p) => p.measureId === id)) return s
  const placed: PlacedMeasure = { measureId: id, objective: defaultObjective(m, s.asOf) }
  return { ...s, plan: { ...s.plan, measures: [...s.plan.measures, placed] } }
}

export function removeMeasure(s: AppState, id: MeasureId): AppState {
  return {
    ...s,
    plan: {
      ...s.plan,
      measures: s.plan.measures.filter((p) => p.measureId !== id),
      overrides: s.plan.overrides.filter((o) => o.measureId !== id),
    },
  }
}

export function patchMeasure(s: AppState, id: MeasureId, patch: Partial<PlacedMeasure>): AppState {
  return { ...s, plan: { ...s.plan, measures: s.plan.measures.map((p) => (p.measureId === id ? { ...p, ...patch } : p)) } }
}

export function addOverride(s: AppState, o: Override): AppState {
  const rest = s.plan.overrides.filter((x) => !(x.measureId === o.measureId && x.rule === o.rule))
  return { ...s, plan: { ...s.plan, overrides: [...rest, o] } }
}

export function acceptProposal(s: AppState, p: AcceptedProposal): AppState {
  if (s.acceptedProposals.some((x) => x.stressor === p.stressor && x.checkupId === p.checkupId && x.quote === p.quote)) return s
  return { ...s, acceptedProposals: [...s.acceptedProposals, p] }
}

export function setVariant(s: AppState, variant: Variant): AppState {
  return { ...s, variant }
}

export function checkupsFor(s: AppState): Checkup[] {
  return s.variant === 'controlMoved' ? scenario.checkupsControlMoved : scenario.checkups
}

export interface Derived {
  diagnosis: Diagnosis
  assessment: PlanAssessment
  followup: Followup
  outcomes: OutcomeResult[]
}

/** Everything the screens show, computed by the engine. Diagnosis uses only pre-works check-ups (scenario.diagnosisCutoff). */
export function derive(s: AppState): Derived {
  const all = checkupsFor(s)
  const diagnosis = diagnose(
    catalogue,
    all.filter((c) => c.date < scenario.diagnosisCutoff),
    checkupItems,
    readingRuleSet,
    s.acceptedProposals,
  )
  const assessment = prescribe(catalogue, diagnosis, s.plan)
  const fu = followup(catalogue, s.plan, all, s.asOf)
  const outcomes: OutcomeResult[] = []
  for (const it of fu.items) {
    if (it.knowableFrom === null) continue // not built: no clock, no verdict
    outcomes.push(outcome(catalogue, s.plan, it.measureId, it.indicator, all, s.asOf))
  }
  return { diagnosis, assessment, followup: fu, outcomes }
}

// ── shareable URL hash ─────────────────────────────────────────────────────────────────
const b64 = (str: string) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const unb64 = (s: string) =>
  new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)))

export function encodeState(s: AppState): string {
  return b64(JSON.stringify({ v: 1, plan: s.plan, variant: s.variant, asOf: s.asOf, ap: s.acceptedProposals }))
}

const RULES: RuleId[] = ['R1', 'R1a', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8']
const isoRe = /^\d{4}-\d{2}-\d{2}$/

/** Decode and VALIDATE. Anything unknown or malformed is dropped, never trusted: a hash is user input. */
export function decodeState(hash: string): AppState | null {
  try {
    const j = JSON.parse(unb64(hash.replace(/^#/, '')))
    if (!j || j.v !== 1 || typeof j.plan !== 'object' || j.plan === null) return null
    const p = j.plan
    const measures: PlacedMeasure[] = (Array.isArray(p.measures) ? p.measures : [])
      .filter((m: PlacedMeasure) => m && measureById.has(m.measureId))
      .filter((m: PlacedMeasure, i: number, a: PlacedMeasure[]) => a.findIndex((x) => x.measureId === m.measureId) === i)
      .map(
        (m: PlacedMeasure): PlacedMeasure => ({
          measureId: m.measureId,
          ...(m.objective &&
          typeof m.objective.specific === 'string' &&
          catalogue.indicators.some((i) => i.id === m.objective!.indicator) &&
          typeof m.objective.measurable === 'number' &&
          isoRe.test(String(m.objective.timeBound))
            ? { objective: m.objective }
            : {}),
          ...(isoRe.test(String(m.implementedOn)) ? { implementedOn: m.implementedOn } : {}),
          ...(m.infeasibility && typeof m.infeasibility.reason === 'string' && typeof m.infeasibility.approver === 'string'
            ? { infeasibility: m.infeasibility }
            : {}),
        }),
      )
    const overrides: Override[] = (Array.isArray(p.overrides) ? p.overrides : []).filter(
      (o: Override) =>
        o && measureById.has(o.measureId) && RULES.includes(o.rule) && typeof o.reason === 'string' && typeof o.approver === 'string',
    )
    const knownReach = (r: unknown) => scenario.reaches.some((x) => x.id === r)
    return {
      plan: {
        id: typeof p.id === 'string' ? p.id.slice(0, 60) : 'shared',
        name: typeof p.name === 'string' ? p.name.slice(0, 80) : 'Shared plan',
        impactReachId: knownReach(p.impactReachId) ? p.impactReachId : 'vale-impact',
        ...(knownReach(p.controlReachId) ? { controlReachId: p.controlReachId } : {}),
        measures,
        overrides,
      },
      variant: j.variant === 'controlMoved' ? 'controlMoved' : 'base',
      asOf: isoRe.test(String(j.asOf)) ? j.asOf : scenario.asOf,
      acceptedProposals: (Array.isArray(j.ap) ? j.ap : []).filter(
        (a: AcceptedProposal) =>
          a && typeof a.quote === 'string' && typeof a.checkupId === 'string' && catalogue.stressors.some((x) => x.id === a.stressor),
      ),
    }
  } catch {
    return null
  }
}
