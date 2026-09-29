/**
 * Firstline engine contract. Every module in engine/ imports from here and nothing else outside engine/.
 * The engine is pure: no I/O, no clock (dates are passed in), no randomness except the seeded PRNG.
 * Verdicts are owned by this engine. An LLM may propose evidence, never a verdict (ideation.md §3).
 */

// ── identifiers ────────────────────────────────────────────────────────────────────────
export type StressorId =
  | 'S01' | 'S02' | 'S03' | 'S04' | 'S05' | 'S06'
  | 'S07' | 'S08' | 'S09' | 'S10' | 'S11' | 'S12'
export type MeasureId = string // "4.3.3"
export type IndicatorId = string
export type ItemId = string
export type ReachId = string
export type RuleId = 'R1' | 'R1a' | 'R2' | 'R3' | 'R4' | 'R5' | 'R6' | 'R7' | 'R8'

/** D2.4 hierarchy. L1 essential · L2 structural · L3 social · L4 complementary · C-* compensatory (last resort). */
export type Line = 'L1' | 'L2' | 'L3' | 'L4' | 'C-hydro' | 'C-chem'
export type ResponseLag = 'fast' | 'medium' | 'slow'

// ── catalogue data (data/d24/*.json, encoded from D2.4 with a page cite on every fact) ──
export interface Cite {
  /** Printed page number in the D2.4 running head. */
  page: number
  /** Verbatim text from that page. verify-d24-cites asserts it is a substring of the page text. */
  quote: string
}

export interface Stressor {
  id: StressorId
  name: string
  d24Text: string
  page: number
  /** True where D2.4 p.19 names the concern first-line (water quality, riparian function, hydrological/sealing). */
  firstLine: boolean
  citizenObservable: boolean
}

export interface Measure {
  id: MeasureId
  name: string
  line: Line
  addresses: StressorId[]
  objective: string
  limitations: string
  page: number
  /** Indicators a citizen (or a field form) can use to monitor the effect of this measure. */
  citizenMonitorable: IndicatorId[]
  responseLag: ResponseLag
  /** Bio-engineered/vegetated works: D2.4 p.26 says the first 2-3 years are establishment. */
  establishmentYears?: number
  variants?: string[]
  note?: string
}

export interface RuleDef {
  id: RuleId
  name: string
  verdict: string
  page: number
  quote: string
}

export interface RuleParams {
  /** R1: which measure lines count as "addressing" a first-line stressor. `default` applies unless the stressor id is a key. */
  r1AddressedBy: { default: Line[] } & Partial<Record<StressorId, Line[]>>
  /** R2: the stressor and measures for the barrier exception. */
  r2: { stressor: StressorId; measures: MeasureId[] }
  /** R3: symptom-only measures (invasive species control). */
  r3SymptomMeasures: MeasureId[]
  /** R4: lines that are last-resort. */
  r4CompensatoryLines: Line[]
  /** R7: lag windows in days per class. `assumption: true` = declared by us, not a D2.4 number. */
  r7LagDays: Record<ResponseLag, { days: number; assumption: boolean; cite?: Cite }>
  /** R8/BACI minimum observations per cell before any verdict other than NOT_YET_KNOWABLE. */
  minPerCell: number
  bootstrapResamples: number
  ciLevel: number
}

export interface Catalogue {
  stressors: Stressor[]
  measures: Measure[]
  rules: RuleDef[]
  params: RuleParams
  indicators: Indicator[]
}

// ── evidence ───────────────────────────────────────────────────────────────────────────
export interface Indicator {
  id: IndicatorId
  name: string
  /** Ordinal scale, normalised so that a HIGHER value is ALWAYS better. */
  scale: { min: number; max: number }
  /** The meaningful change δ in scale units. Declared, and shown in the UI. */
  delta: number
  responseLag: ResponseLag
  citizenObservable: boolean
  source: string
}

export interface ItemEvidence {
  answer: string
  stressor: StressorId
  /** A single citizen answer can only `suggest`. `confirm` needs a sourced reading or 2+ independent check-ups. */
  strength: 'confirm' | 'suggest'
}

export interface CheckupItem {
  id: ItemId
  text: string
  source: string
  answers: string[]
  evidence: ItemEvidence[]
}

/** A field reading that can confirm a stressor on its own. Only allowed when the threshold has a source. */
export interface ReadingRule {
  id: string
  name: string
  unit: string
  stressor: StressorId
  op: '>' | '<' | '>=' | '<='
  threshold: number
  source: string
}

export type Provenance = 'field' | 'scenario'

export interface Checkup {
  id: string
  reachId: ReachId
  /** ISO date YYYY-MM-DD. */
  date: string
  observer: string
  provenance: Provenance
  answers: Record<ItemId, string>
  readings?: Record<string, number>
  /** Scored indicator classes (higher = better), used by the outcome verdict. */
  indicators?: Record<IndicatorId, number>
  note?: string
}

/** A proposal from the LLM that a human accepted. Enters diagnosis as `suggest`, never `confirm`. */
export interface AcceptedProposal {
  stressor: StressorId
  quote: string
  checkupId: string
}

export type EvidenceSource = 'item' | 'reading' | 'accepted-proposal'
export interface EvidenceRef {
  source: EvidenceSource
  checkupId: string
  ref: string
  strength: 'confirm' | 'suggest'
}

// ── verdicts ───────────────────────────────────────────────────────────────────────────
export type StressorStatus = 'CONFIRMED' | 'SUSPECTED' | 'NOT_ASSESSED'
export type MeasureVerdict =
  | 'INDICATED'
  | 'CONTRAINDICATED'
  | 'DEFERRED'
  | 'SYMPTOM_ONLY'
  | 'ALLOWED_BY_OVERRIDE'
export type PlanVerdict = 'SIGNABLE' | 'INCOMPLETE' | 'BLOCKED'
export type OutcomeVerdict =
  | 'IMPROVED'
  | 'DECLINED'
  | 'NO_DETECTABLE_CHANGE'
  | 'NOT_YET_KNOWABLE'
  | 'CONFOUNDED'

/** Why. Every verdict carries at least one. */
export interface Reason {
  rule: RuleId
  page: number
  quote: string
  plain: string
  /** Measures to consider instead (R1, R3). */
  instead?: MeasureId[]
}

/** A verdict that cannot be constructed without a reason: the tuple type forces >=1. */
export interface Verdicted<V extends string> {
  verdict: V
  reasons: [Reason, ...Reason[]]
}

export interface StressorDiagnosis {
  status: StressorStatus
  evidence: EvidenceRef[]
  /** What would settle SUSPECTED / NOT_ASSESSED into CONFIRMED: item ids or reading rule ids. */
  settleWith: string[]
}
export type Diagnosis = Record<StressorId, StressorDiagnosis>

// ── plan ───────────────────────────────────────────────────────────────────────────────
export interface SmartObjective {
  specific: string
  indicator: IndicatorId
  /** Target change in scale units, must be > 0. */
  measurable: number
  /** ISO date by which it is to be assessed. */
  timeBound: string
}

export interface PlacedMeasure {
  measureId: MeasureId
  objective?: SmartObjective
  /** ISO date the works were finished; absent = not yet built. */
  implementedOn?: string
  /** R4: the officer recorded why lines 1-3 are infeasible here. Must have a written reason. */
  infeasibility?: { reason: string; approver: string }
}

export interface Override {
  measureId: MeasureId
  rule: RuleId
  /** >=20 characters. */
  reason: string
  approver: string
}

export interface Plan {
  id: string
  name: string
  impactReachId: ReachId
  controlReachId?: ReachId
  measures: PlacedMeasure[]
  overrides: Override[]
}

export interface MeasureAssessment extends Verdicted<MeasureVerdict> {
  measureId: MeasureId
}

export interface PlanAssessment extends Verdicted<PlanVerdict> {
  measures: MeasureAssessment[]
  /** Confirmed first-line stressors not addressed by the plan. */
  uncovered: StressorId[]
  /** Override ledger: what was overridden, by whom, why. */
  overridden: Override[]
}

// ── follow-up ──────────────────────────────────────────────────────────────────────────
export type BaciDesign = 'BACI' | 'BA'
export interface FollowupItem {
  measureId: MeasureId
  indicator: IndicatorId
  design: BaciDesign
  /** ISO date from which an outcome verdict is allowed (R7). null = the measure is not built yet, so no clock has started. */
  knowableFrom: string | null
  /** Check-ups still needed per cell to reach `minPerCell` before then. */
  visitsNeeded: { beforeImpact: number; afterImpact: number; beforeControl: number; afterControl: number }
  reasons: [Reason, ...Reason[]]
}
export interface Followup {
  planId: string
  items: FollowupItem[]
}

export interface CellStats {
  n: number
  mean: number
}
export interface OutcomeResult extends Verdicted<OutcomeVerdict> {
  measureId: MeasureId
  indicator: IndicatorId
  design: BaciDesign
  /** BACI contrast, sign-adjusted so positive = better. Absent when NOT_YET_KNOWABLE for lack of data. */
  contrast?: number
  ci?: { low: number; high: number; level: number }
  delta: number
  cells: { beforeImpact: CellStats; afterImpact: CellStats; beforeControl?: CellStats; afterControl?: CellStats }
  /** For NOT_YET_KNOWABLE: check-ups still needed per cell, and the earliest date. */
  visitsNeeded?: number
  knowableFrom?: string
}
