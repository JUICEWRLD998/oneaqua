/** Shared helpers for followup and verdict: design choice, the R7 clock, and BACI cell collection. */
import { addDays } from './dates'
import type { BaciDesign, Catalogue, Checkup, Indicator, Measure, PlacedMeasure, Plan } from './types'

export function designOf(plan: Plan): BaciDesign {
  return plan.controlReachId ? 'BACI' : 'BA'
}

export function findMeasure(cat: Catalogue, id: string): Measure {
  const m = cat.measures.find((x) => x.id === id)
  if (!m) throw new Error(`unknown measure id: ${id}`)
  return m
}

export function findIndicator(cat: Catalogue, id: string): Indicator {
  const i = cat.indicators.find((x) => x.id === id)
  if (!i) throw new Error(`unknown indicator id: ${id}`)
  return i
}

export function findPlaced(plan: Plan, id: string): PlacedMeasure {
  const p = plan.measures.find((x) => x.measureId === id)
  if (!p) throw new Error(`measure ${id} is not in plan ${plan.id}`)
  return p
}

/** R7 lag in days: establishment years if set, else the longer of the measure's and the indicator's response class. */
export function lagDays(cat: Catalogue, m: Measure, ind: Indicator): number {
  if (m.establishmentYears) return m.establishmentYears * 365
  return Math.max(cat.params.r7LagDays[m.responseLag].days, cat.params.r7LagDays[ind.responseLag].days)
}

/** null when the measure has no implementedOn (no clock has started). */
export function knowableFromFor(cat: Catalogue, m: Measure, ind: Indicator, placed: PlacedMeasure): string | null {
  return placed.implementedOn ? addDays(placed.implementedOn, lagDays(cat, m, ind)) : null
}

export interface CellValues {
  beforeImpact: number[]
  afterImpact: number[]
  beforeControl: number[]
  afterControl: number[]
}

/** Numeric indicator values per cell. Before = date < implementedOn (everything, if unbuilt); after = date >= implementedOn. */
export function collectCells(
  plan: Plan,
  placed: PlacedMeasure,
  indicatorId: string,
  checkups: Checkup[],
): CellValues {
  const cells: CellValues = { beforeImpact: [], afterImpact: [], beforeControl: [], afterControl: [] }
  const ordered = [...checkups].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  for (const c of ordered) {
    const v = c.indicators?.[indicatorId]
    if (typeof v !== 'number' || !Number.isFinite(v)) continue
    const isBefore = placed.implementedOn === undefined || c.date < placed.implementedOn
    if (c.reachId === plan.impactReachId) (isBefore ? cells.beforeImpact : cells.afterImpact).push(v)
    else if (plan.controlReachId !== undefined && c.reachId === plan.controlReachId) {
      ;(isBefore ? cells.beforeControl : cells.afterControl).push(v)
    }
  }
  return cells
}
