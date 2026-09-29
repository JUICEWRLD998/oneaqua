import { collectCells, designOf, findIndicator, findMeasure, findPlaced, knowableFromFor } from './cells'
import { hashString, mulberry32 } from './prng'
import { reasonFor, ruleDisabled } from './reasons'
import type { EngineOptions } from './reasons'
import type { CellStats, Catalogue, Checkup, OutcomeResult, Plan } from './types'

const mean = (xs: number[]): number => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length)

function resampleMean(xs: number[], rand: () => number): number {
  let s = 0
  for (let i = 0; i < xs.length; i++) s += xs[Math.floor(rand() * xs.length)] as number
  return s / xs.length
}

/**
 * The outcome verdict: BACI (or before-after, without a control reach) contrast with a seeded bootstrap CI.
 * Higher indicator values are better, so a positive contrast is an improvement.
 */
export function outcome(
  cat: Catalogue,
  plan: Plan,
  measureId: string,
  indicatorId: string,
  checkups: Checkup[],
  today: string,
  opts?: EngineOptions,
  seed?: number,
): OutcomeResult {
  const m = findMeasure(cat, measureId)
  const placed = findPlaced(plan, measureId)
  const ind = findIndicator(cat, indicatorId)
  const design = designOf(plan)
  const min = cat.params.minPerCell
  const delta = ind.delta
  const cv = collectCells(plan, placed, indicatorId, checkups)
  const stat = (xs: number[]): CellStats => ({ n: xs.length, mean: mean(xs) })
  const cells: OutcomeResult['cells'] = { beforeImpact: stat(cv.beforeImpact), afterImpact: stat(cv.afterImpact) }
  if (design === 'BACI') {
    cells.beforeControl = stat(cv.beforeControl)
    cells.afterControl = stat(cv.afterControl)
  }
  const required = design === 'BACI' ? [cv.beforeImpact, cv.afterImpact, cv.beforeControl, cv.afterControl] : [cv.beforeImpact, cv.afterImpact]
  const shortfall = Math.max(...required.map((c) => Math.max(0, min - c.length)))
  const designText =
    design === 'BACI'
      ? `BACI against control reach ${plan.controlReachId}.`
      : 'Before-after only, no control reach: other changes in the catchment cannot be ruled out.'
  const base = { measureId, indicator: indicatorId, design, delta, cells }

  // (1) not built
  if (placed.implementedOn === undefined) {
    return {
      ...base,
      verdict: 'NOT_YET_KNOWABLE',
      reasons: [reasonFor(cat, 'R7', `${measureId} is not built yet: the response clock has not started.`)],
      visitsNeeded: shortfall,
    }
  }

  // (2) R7 lag
  const knowableFrom = knowableFromFor(cat, m, ind, placed) as string
  if (!ruleDisabled(opts, 'R7') && today < knowableFrom) {
    return {
      ...base,
      verdict: 'NOT_YET_KNOWABLE',
      reasons: [reasonFor(cat, 'R7', `${measureId} / ${indicatorId} cannot be judged before ${knowableFrom}: the response lag has not passed.`)],
      knowableFrom,
      visitsNeeded: shortfall,
    }
  }

  // (3) R8 minimum per cell (an empty cell has no mean, so it is always insufficient)
  const anyEmpty = required.some((c) => c.length === 0)
  if ((!ruleDisabled(opts, 'R8') && shortfall > 0) || anyEmpty) {
    return {
      ...base,
      verdict: 'NOT_YET_KNOWABLE',
      reasons: [reasonFor(cat, 'R8', `Too few check-ups in a cell (need ${min} each). ${designText}`)],
      visitsNeeded: Math.max(1, shortfall),
    }
  }

  // (4) contrast and bootstrap
  const cIb = mean(cv.beforeImpact)
  const cIa = mean(cv.afterImpact)
  const controlShift = design === 'BACI' ? mean(cv.afterControl) - mean(cv.beforeControl) : 0
  const contrast = cIa - cIb - controlShift
  const rand = mulberry32((hashString(`${plan.id}|${measureId}|${indicatorId}`) ^ (seed ?? 0)) >>> 0)
  const B = cat.params.bootstrapResamples
  const draws: number[] = []
  for (let b = 0; b < B; b++) {
    const bi = resampleMean(cv.beforeImpact, rand)
    const ai = resampleMean(cv.afterImpact, rand)
    let d = ai - bi
    if (design === 'BACI') d -= resampleMean(cv.afterControl, rand) - resampleMean(cv.beforeControl, rand)
    draws.push(d)
  }
  draws.sort((a, b) => a - b)
  const alpha = (1 - cat.params.ciLevel) / 2
  const low = draws[Math.min(B - 1, Math.floor(alpha * B))] as number
  const high = draws[Math.min(B - 1, Math.floor((1 - alpha) * B))] as number
  const ci = { low, high, level: cat.params.ciLevel }
  const decided = { ...base, contrast, ci }
  const r8 = (text: string) => [reasonFor(cat, 'R8', `${text} ${designText}`)] as [ReturnType<typeof reasonFor>]

  // (5) decision order
  if (design === 'BACI' && !ruleDisabled(opts, 'R8') && Math.abs(controlShift) >= delta && low <= 0 && 0 <= high) {
    return {
      ...decided,
      verdict: 'CONFOUNDED',
      reasons: r8(`The control reach moved by ${controlShift.toFixed(2)} (at least delta ${delta}) and the contrast interval spans zero, so the change is not attributable to the measure.`),
    }
  }
  if (low > 0 && contrast >= delta) {
    return { ...decided, verdict: 'IMPROVED', reasons: r8(`Contrast ${contrast.toFixed(2)} with the ${Math.round(ci.level * 100)}% interval above zero and at least delta ${delta}.`) }
  }
  if (high < 0 && contrast <= -delta) {
    return { ...decided, verdict: 'DECLINED', reasons: r8(`Contrast ${contrast.toFixed(2)} with the ${Math.round(ci.level * 100)}% interval below zero and beyond delta ${delta}.`) }
  }
  if (low > -delta && high < delta) {
    return {
      ...decided,
      verdict: 'NO_DETECTABLE_CHANGE',
      reasons: r8(`The ${Math.round(ci.level * 100)}% interval [${low.toFixed(2)}, ${high.toFixed(2)}] lies inside plus or minus delta ${delta}.`),
    }
  }
  const nMin = Math.min(...required.map((c) => c.length))
  const half = (high - low) / 2
  const visitsNeeded = Math.max(1, Math.ceil(nMin * (half / (delta / 2)) ** 2 - nMin))
  return {
    ...decided,
    verdict: 'NOT_YET_KNOWABLE',
    reasons: r8(`Interval too wide ([${low.toFixed(2)}, ${high.toFixed(2)}]) to tell a change of delta ${delta} from none.`),
    visitsNeeded,
  }
}
