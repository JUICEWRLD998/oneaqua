import { isIsoDate } from './dates'
import { reasonFor, ruleDisabled, type EngineOptions } from './reasons'
import type {
  Catalogue,
  Diagnosis,
  Measure,
  MeasureAssessment,
  Override,
  PlacedMeasure,
  Plan,
  PlanAssessment,
  PlanVerdict,
  Reason,
  StressorId,
} from './types'

const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

export function validInfeasibility(p: PlacedMeasure): boolean {
  const i = p.infeasibility
  return !!i && i.reason.trim().length >= 20 && i.approver.trim().length > 0
}

function validOverride(o: Override, measureId: string): boolean {
  return o.measureId === measureId && o.rule === 'R1' && o.reason.trim().length >= 20 && o.approver.trim().length > 0
}

function validSmart(cat: Catalogue, p: PlacedMeasure): boolean {
  const o = p.objective
  if (!o) return false
  return (
    o.specific.trim().length > 0 &&
    cat.indicators.some((i) => i.id === o.indicator) &&
    Number.isFinite(o.measurable) &&
    o.measurable > 0 &&
    isIsoDate(o.timeBound)
  )
}

/** Apply rules R1-R6 to a plan given a diagnosis. Deterministic and pure. */
export function prescribe(cat: Catalogue, diagnosis: Diagnosis, plan: Plan, opts?: EngineOptions): PlanAssessment {
  const byId = new Map<string, Measure>(cat.measures.map((m) => [m.id, m]))
  const seen = new Set<string>()
  const placed: Array<{ p: PlacedMeasure; m: Measure }> = []
  for (const p of plan.measures) {
    const m = byId.get(p.measureId)
    if (!m) throw new Error(`unknown measure id in plan: ${p.measureId}`)
    if (seen.has(p.measureId)) throw new Error(`duplicate measure id in plan: ${p.measureId}`)
    seen.add(p.measureId)
    placed.push({ p, m })
  }

  const confirmedIds = cat.stressors.filter((s) => diagnosis[s.id]?.status === 'CONFIRMED').map((s) => s.id)
  const firstLine = cat.stressors.filter((s) => s.firstLine && diagnosis[s.id]?.status === 'CONFIRMED').map((s) => s.id)

  const addressed = (s: StressorId): boolean => {
    const lines = cat.params.r1AddressedBy[s] ?? cat.params.r1AddressedBy.default
    return placed.some(({ p, m }) => {
      if (!m.addresses.includes(s) || !lines.includes(m.line)) return false
      return m.line.startsWith('C-') ? validInfeasibility(p) : true
    })
  }
  const uncovered = firstLine.filter((s) => !addressed(s)).sort(cmp)

  const instead = cat.measures
    .filter((m) => m.line === 'L1' && m.addresses.some((s) => uncovered.includes(s)))
    .map((m) => m.id)
    .sort(cmp)

  const overridden: Override[] = []
  const r2Confirmed = diagnosis[cat.params.r2.stressor]?.status === 'CONFIRMED'

  const measures: MeasureAssessment[] = placed.map(({ p, m }): MeasureAssessment => {
    const id = m.id
    const done = (verdict: MeasureAssessment['verdict'], reason: Reason): MeasureAssessment => ({
      measureId: id,
      verdict,
      reasons: [reason],
    })

    if (!ruleDisabled(opts, 'R2') && cat.params.r2.measures.includes(id) && r2Confirmed) {
      return done(
        'INDICATED',
        reasonFor(cat, 'R2', `${cat.params.r2.stressor} is confirmed, so ${id} is promoted ahead of the line order.`),
      )
    }

    if (!ruleDisabled(opts, 'R1') && m.line === 'L2' && uncovered.length > 0) {
      const ov = plan.overrides.find((o) => validOverride(o, id))
      if (ov) {
        overridden.push(ov)
        return done(
          'ALLOWED_BY_OVERRIDE',
          reasonFor(
            cat,
            'R1a',
            `Override by ${ov.approver.trim()}: ${ov.reason.trim()} (uncovered first-line stressors: ${uncovered.join(', ')}).`,
          ),
        )
      }
      return done(
        'CONTRAINDICATED',
        reasonFor(cat, 'R1', `${id} is a structural measure but first-line stressors ${uncovered.join(', ')} are not addressed yet.`, instead),
      )
    }

    if (!ruleDisabled(opts, 'R3') && cat.params.r3SymptomMeasures.includes(id) && uncovered.length > 0) {
      return done(
        'SYMPTOM_ONLY',
        reasonFor(cat, 'R3', `${id} treats a symptom while first-line stressors ${uncovered.join(', ')} remain unaddressed.`, instead),
      )
    }

    if (!ruleDisabled(opts, 'R4') && cat.params.r4CompensatoryLines.includes(m.line)) {
      return validInfeasibility(p)
        ? done('INDICATED', reasonFor(cat, 'R4', `${id} is a last resort and the infeasibility of lines 1 to 3 is recorded.`))
        : done('DEFERRED', reasonFor(cat, 'R4', `${id} is compensatory: record why lines 1 to 3 are infeasible first.`))
    }

    return done('INDICATED', reasonFor(cat, 'R1', `${id} respects the measure hierarchy.`))
  })

  // ── plan verdict ────────────────────────────────────────────────────────────────────
  const blocked: Reason[] = measures.filter((m) => m.verdict === 'CONTRAINDICATED').map((m) => m.reasons[0])
  const incomplete: Reason[] = []
  // R1a: a valid written override is the approver's accepted, accountable departure from the hierarchy. It waives the
  // package-completeness hits below (the open first-line stressors are named in the R1a reason and exported as a
  // DetectedIssue with its mitigation). It never waives an empty plan or a missing SMART objective.
  const waived = overridden.length > 0
  if (!ruleDisabled(opts, 'R5')) {
    if (plan.measures.length === 0) {
      incomplete.push(reasonFor(cat, 'R5', 'The plan has no measures.'))
    }
    if (uncovered.length > 0 && !waived) {
      incomplete.push(reasonFor(cat, 'R5', `Confirmed first-line stressors not addressed: ${uncovered.join(', ')}.`, instead))
    }
    if (confirmedIds.length >= 2 && plan.measures.length === 1 && !waived) {
      incomplete.push(reasonFor(cat, 'R5', `${confirmedIds.length} stressors are confirmed but the plan has a single measure.`))
    }
  }
  if (!ruleDisabled(opts, 'R6')) {
    for (const { p } of placed) {
      if (!validSmart(cat, p)) {
        incomplete.push(
          reasonFor(cat, 'R6', `${p.measureId} needs a SMART objective: specific text, a known indicator, a target above zero and a due date.`),
        )
      }
    }
  }

  let verdict: PlanVerdict
  let reasons: [Reason, ...Reason[]]
  const [b0, ...bRest] = blocked
  const [i0, ...iRest] = incomplete
  if (b0) {
    verdict = 'BLOCKED'
    reasons = [b0, ...bRest]
  } else if (i0) {
    verdict = 'INCOMPLETE'
    reasons = [i0, ...iRest]
  } else {
    verdict = 'SIGNABLE'
    reasons = waived
      ? [reasonFor(cat, 'R1a', `Signable on a written override by ${overridden[0]!.approver.trim()}. Confirmed first-line stressors left open by that decision: ${uncovered.join(', ') || 'none'}.`)]
      : [reasonFor(cat, 'R1', 'No blocking measure, every confirmed first-line stressor is addressed, and each measure has a SMART objective.')]
  }

  return { verdict, reasons, measures, uncovered, overridden }
}
