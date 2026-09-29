import { collectCells, designOf, findIndicator, findMeasure, knowableFromFor } from './cells'
import { reasonFor } from './reasons'
import type { EngineOptions } from './reasons'
import type { Catalogue, Checkup, Followup, FollowupItem, Plan } from './types'

/**
 * What to monitor, from when (R7), and how many check-ups each BACI cell still needs.
 * `today` is accepted for API symmetry with `outcome`; the schedule itself is date-independent.
 */
export function followup(
  cat: Catalogue,
  plan: Plan,
  checkups: Checkup[],
  _today: string,
  _opts?: EngineOptions,
): Followup {
  void _today
  void _opts
  const design = designOf(plan)
  const min = cat.params.minPerCell
  const items: FollowupItem[] = []

  for (const placed of plan.measures) {
    const m = findMeasure(cat, placed.measureId)
    for (const indId of m.citizenMonitorable) {
      const ind = cat.indicators.find((i) => i.id === indId)
      if (!ind || !ind.citizenObservable) continue
      const cells = collectCells(plan, placed, indId, checkups)
      const need = (n: number) => Math.max(0, min - n)
      const knowableFrom = knowableFromFor(cat, m, findIndicator(cat, indId), placed)
      const r7 = reasonFor(
        cat,
        'R7',
        knowableFrom === null
          ? `${m.id} is not built yet: the response clock starts when the works are finished.`
          : `${m.id} / ${indId}: an outcome verdict is allowed from ${knowableFrom}, after the response lag.`,
      )
      const r8 = reasonFor(
        cat,
        'R8',
        design === 'BACI'
          ? `BACI: impact reach ${plan.impactReachId} against control reach ${plan.controlReachId}, at least ${min} check-ups per cell.`
          : `Before-after only, no control reach: a change cannot be separated from what happened everywhere else.`,
      )
      items.push({
        measureId: m.id,
        indicator: indId,
        design,
        knowableFrom,
        visitsNeeded: {
          beforeImpact: need(cells.beforeImpact.length),
          afterImpact: need(cells.afterImpact.length),
          beforeControl: design === 'BACI' ? need(cells.beforeControl.length) : 0,
          afterControl: design === 'BACI' ? need(cells.afterControl.length) : 0,
        },
        reasons: [r7, r8],
      })
    }
  }
  return { planId: plan.id, items }
}
