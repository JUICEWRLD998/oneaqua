/**
 * Casebook replay: a D2.4 case study run through the same engine, one measure at a time, in the order the case text
 * sequences them. This is the positive-control surface: a case the catalogue reports as accepted practice should draw no
 * CONTRAINDICATED verdict.
 */
import { catalogue } from '../engine/catalogue'
import { prescribe } from '../engine/index'
import casebook from '../data/d24/casebook.json'
import type { Diagnosis, MeasureVerdict, PlanVerdict, Plan, Reason, StressorId } from '../engine/types'

interface RawCase {
  id: string
  name: string
  page: number
  stressorsReported: StressorId[]
  stressorEvidence: { stressor: StressorId; page: number; quote: string }[]
  measures: { measureId: string; order: number; page: number; quote: string }[]
}
const cases = casebook as unknown as RawCase[]

export interface CaseSummary { id: string; name: string; page: number; stressors: StressorId[]; measureCount: number }
export interface ReplayStep {
  measureId: string
  measureName: string
  page: number
  quote: string
  verdict: MeasureVerdict
  reason: Reason
  planVerdict: PlanVerdict
}
export interface Replay {
  id: string
  name: string
  page: number
  stressors: { id: StressorId; page: number; quote: string }[]
  steps: ReplayStep[]
  refusals: number
}

function dedupe(c: RawCase) {
  return [...c.measures].sort((a, b) => a.order - b.order).filter((m, i, a) => a.findIndex((x) => x.measureId === m.measureId) === i)
}

export const listCases = (): CaseSummary[] =>
  cases.map((c) => ({ id: c.id, name: c.name, page: c.page, stressors: c.stressorsReported, measureCount: dedupe(c).length }))

function diagnosisFor(confirmed: StressorId[]): Diagnosis {
  const d = {} as Diagnosis
  for (const s of catalogue.stressors) {
    d[s.id] = { status: confirmed.includes(s.id) ? 'CONFIRMED' : 'NOT_ASSESSED', evidence: [], settleWith: [] }
  }
  return d
}

export function replay(caseId: string): Replay | null {
  const c = cases.find((x) => x.id === caseId)
  if (!c) return null
  const ms = dedupe(c)
  const dx = diagnosisFor(c.stressorsReported)
  const steps: ReplayStep[] = ms.map((m, i) => {
    const plan: Plan = {
      id: c.id,
      name: c.name,
      impactReachId: 'vale-impact',
      overrides: [],
      measures: ms.slice(0, i + 1).map((x) => ({
        measureId: x.measureId,
        objective: { specific: 'As reported in the case study', indicator: 'odour', measurable: 1, timeBound: '2030-01-01' },
      })),
    }
    const a = prescribe(catalogue, dx, plan)
    const mine = a.measures[i]!
    return {
      measureId: m.measureId,
      measureName: catalogue.measures.find((x) => x.id === m.measureId)?.name ?? m.measureId,
      page: m.page,
      quote: m.quote,
      verdict: mine.verdict,
      reason: mine.reasons[0],
      planVerdict: a.verdict,
    }
  })
  return {
    id: c.id,
    name: c.name,
    page: c.page,
    stressors: c.stressorEvidence.map((e) => ({ id: e.stressor, page: e.page, quote: e.quote })),
    steps,
    refusals: steps.filter((s) => s.verdict === 'CONTRAINDICATED').length,
  }
}
