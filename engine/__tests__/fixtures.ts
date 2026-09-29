/** Small INLINE synthetic catalogue for engine tests. Pages and quotes are fake; nothing here reads data/. */
import type {
  Catalogue,
  Checkup,
  CheckupItem,
  Diagnosis,
  Indicator,
  Line,
  Measure,
  PlacedMeasure,
  Plan,
  ReadingRule,
  RuleDef,
  SmartObjective,
  Stressor,
  StressorId,
  StressorStatus,
} from '../types'

export const IDS: StressorId[] = ['S01', 'S02', 'S03', 'S04', 'S05', 'S06', 'S07', 'S08', 'S09', 'S10', 'S11', 'S12']

// S01 first-line (sewer/water quality), S02 barrier (not first-line), S03 first-line (riparian), rest fillers.
const FIRST_LINE: StressorId[] = ['S01', 'S03']
export const stressors: Stressor[] = IDS.map((id) => ({
  id,
  name: `Stressor ${id}`,
  d24Text: `fake text for ${id}`,
  page: 10,
  firstLine: FIRST_LINE.includes(id),
  citizenObservable: true,
}))

function m(
  id: string,
  line: Line,
  addresses: StressorId[],
  extra: Partial<Measure> = {},
): Measure {
  return {
    id,
    name: `Measure ${id}`,
    line,
    addresses,
    objective: 'fake objective',
    limitations: 'fake limitations',
    page: 30,
    citizenMonitorable: ['IND1'],
    responseLag: 'medium',
    ...extra,
  }
}

export const measures: Measure[] = [
  m('4.2.2', 'L1', ['S01']), // sewer separation
  m('4.1.1', 'L1', ['S03'], { citizenMonitorable: ['IND1', 'IND2', 'IND3', 'GHOST'], responseLag: 'fast' }), // riparian buffer
  m('4.3.1', 'L2', ['S02']), // barrier removal
  m('4.3.2', 'L2', ['S02']), // fish pass
  m('4.3.3', 'L2', ['S04'], { responseLag: 'slow' }), // re-meandering
  m('4.4.1', 'L3', ['S03', 'S05']), // community stewardship
  m('4.5.1', 'L4', ['S06']), // invasive control (symptom-only)
  m('4.6.1', 'C-hydro', ['S04'], { responseLag: 'fast' }),
  m('4.6.2', 'C-chem', ['S01']),
  m('4.7.1', 'L1', ['S03'], { establishmentYears: 3, citizenMonitorable: ['IND1'] }), // vegetated works
]

export const indicators: Indicator[] = [
  { id: 'IND1', name: 'Indicator one', scale: { min: 1, max: 5 }, delta: 1, responseLag: 'medium', citizenObservable: true, source: 'fake' },
  { id: 'IND2', name: 'Indicator two', scale: { min: 1, max: 5 }, delta: 1, responseLag: 'fast', citizenObservable: true, source: 'fake' },
  { id: 'IND3', name: 'Indicator three', scale: { min: 1, max: 5 }, delta: 1, responseLag: 'fast', citizenObservable: false, source: 'fake' },
]

const ruleNames: Array<[RuleDef['id'], number]> = [
  ['R1', 19], ['R1a', 19], ['R2', 20], ['R3', 21], ['R4', 22], ['R5', 23], ['R6', 24], ['R7', 25], ['R8', 26],
]
export const rules: RuleDef[] = ruleNames.map(([id, page]) => ({
  id,
  name: `Rule ${id}`,
  verdict: `verdict for ${id}`,
  page,
  quote: `fake quote for ${id} on page ${page}`,
}))

export const cat: Catalogue = {
  stressors,
  measures,
  rules,
  indicators,
  params: {
    r1AddressedBy: { default: ['L1'], S03: ['L1', 'L3'] },
    r2: { stressor: 'S02', measures: ['4.3.1', '4.3.2'] },
    r3SymptomMeasures: ['4.5.1'],
    r4CompensatoryLines: ['C-hydro', 'C-chem'],
    r7LagDays: {
      fast: { days: 30, assumption: true },
      medium: { days: 180, assumption: true },
      slow: { days: 365, assumption: true },
    },
    minPerCell: 3,
    bootstrapResamples: 500,
    ciLevel: 0.9,
  },
}

// ── diagnosis helpers ─────────────────────────────────────────────────────────────────
export function diagnosisOf(status: Partial<Record<StressorId, StressorStatus>>): Diagnosis {
  const d = {} as Diagnosis
  for (const id of IDS) d[id] = { status: status[id] ?? 'NOT_ASSESSED', evidence: [], settleWith: [] }
  return d
}
export const confirmed = (...ids: StressorId[]): Diagnosis =>
  diagnosisOf(Object.fromEntries(ids.map((i) => [i, 'CONFIRMED'])) as Partial<Record<StressorId, StressorStatus>>)

// ── plan helpers ──────────────────────────────────────────────────────────────────────
export const goodObjective: SmartObjective = {
  specific: 'Raise the indicator on the impact reach',
  indicator: 'IND1',
  measurable: 1,
  timeBound: '2028-06-30',
}
export const place = (measureId: string, extra: Partial<PlacedMeasure> = {}): PlacedMeasure => ({
  measureId,
  objective: { ...goodObjective },
  ...extra,
})
export const planOf = (measureIds: string[], extra: Partial<Plan> = {}): Plan => ({
  id: 'plan-1',
  name: 'Test plan',
  impactReachId: 'R-imp',
  controlReachId: 'R-ctl',
  measures: measureIds.map((i) => place(i)),
  overrides: [],
  ...extra,
})
export const validInfeasibility = { reason: 'Lines 1 to 3 are physically infeasible here.', approver: 'Officer A' }

// ── checkup items and reading rules ───────────────────────────────────────────────────
export const items: CheckupItem[] = [
  {
    id: 'I1',
    text: 'Do you smell sewage?',
    source: 'fake',
    answers: ['yes', 'no'],
    evidence: [{ answer: 'yes', stressor: 'S01', strength: 'confirm' }], // own strength must be ignored
  },
  {
    id: 'I2',
    text: 'Is there a weir?',
    source: 'fake',
    answers: ['yes', 'no'],
    evidence: [{ answer: 'yes', stressor: 'S02', strength: 'suggest' }],
  },
]
export const readingRules: ReadingRule[] = [
  { id: 'RR1', name: 'Ammonium', unit: 'mg/l', stressor: 'S01', op: '>', threshold: 0.5, source: 'fake source' },
  { id: 'RR2', name: 'Unsourced', unit: 'mg/l', stressor: 'S03', op: '>=', threshold: 1, source: '' },
]

export function checkup(id: string, over: Partial<Checkup> = {}): Checkup {
  return { id, reachId: 'R-imp', date: '2026-01-01', observer: 'obs-a', provenance: 'field', answers: {}, ...over }
}

// ── BACI data: deterministic, small noise ─────────────────────────────────────────────
const NOISE = [-0.2, 0.1, 0.2, -0.1, 0.0, 0.15, -0.15, 0.05, -0.05, 0.1]
const noise = (i: number) => NOISE[i % NOISE.length] ?? 0

export interface BaciSpec {
  n: number | { bi: number; ai: number; bc: number; ac: number }
  base?: number
  impactShift: number
  controlShift: number
  /** ISO date works were implemented; before < this <= after. */
  implementedOn?: string
  indicator?: string
}
/** Emit checkups for both reaches. Before dates are in 2026-H1, after dates in 2027-H2. */
export function baciCheckups(spec: BaciSpec): Checkup[] {
  const ind = spec.indicator ?? 'IND1'
  const base = spec.base ?? 3
  const n =
    typeof spec.n === 'number' ? { bi: spec.n, ai: spec.n, bc: spec.n, ac: spec.n } : spec.n
  const out: Checkup[] = []
  const mk = (cell: string, reach: string, count: number, month: string, value: number) => {
    for (let i = 0; i < count; i++) {
      const day = String(1 + i).padStart(2, '0')
      out.push(
        checkup(`${cell}-${i}`, {
          reachId: reach,
          date: `${month}-${day}`,
          observer: `obs-${i % 3}`,
          indicators: { [ind]: value + noise(i + cell.charCodeAt(0) + 3 * cell.charCodeAt(1)) },
        }),
      )
    }
  }
  mk('bi', 'R-imp', n.bi, '2026-03', base)
  mk('ai', 'R-imp', n.ai, '2027-09', base + spec.impactShift)
  mk('bc', 'R-ctl', n.bc, '2026-03', base)
  mk('ac', 'R-ctl', n.ac, '2027-09', base + spec.controlShift)
  return out
}
