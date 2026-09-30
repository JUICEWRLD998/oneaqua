import { catalogue, checkupItems, readingRuleSet } from '../../engine/catalogue'
import type { Line, Measure, StressorId } from '../../engine/types'

export const measureById = new Map(catalogue.measures.map((m) => [m.id, m]))
export const stressorById = new Map(catalogue.stressors.map((x) => [x.id, x]))
export const indicatorById = new Map(catalogue.indicators.map((i) => [i.id, i]))
export const ruleById = new Map(catalogue.rules.map((r) => [r.id, r]))
export const itemById = new Map(checkupItems.map((i) => [i.id, i]))
export const readingById = new Map(readingRuleSet.map((r) => [r.id, r]))

export const measureName = (id: string): string => measureById.get(id)?.name ?? id
export const indicatorName = (id: string): string => (indicatorById.get(id)?.name ?? id).replace(/ \(.*\)$/, '')

/** D2.4 measure hierarchy. Pages are the printed pages where the hierarchy is defined. */
export const LINES: { id: Line; name: string; tag: string; page: number }[] = [
  { id: 'L1', name: 'First line', tag: 'essential', page: 19 },
  { id: 'L2', name: 'Second line', tag: 'structural', page: 20 },
  { id: 'L3', name: 'Third line', tag: 'social', page: 20 },
  { id: 'L4', name: 'Fourth line', tag: 'complementary', page: 20 },
  { id: 'C-hydro', name: 'Compensatory', tag: 'hydrological', page: 21 },
  { id: 'C-chem', name: 'Compensatory', tag: 'chemical', page: 21 },
]

export const measuresOfLine = (l: Line): Measure[] => catalogue.measures.filter((m) => m.line === l)

export interface Settle { kind: 'item' | 'reading'; id: string; text: string; answers?: string[] }
/** What would move a stressor toward CONFIRMED: check-up items to ask, or a sourced reading to take. */
export function settleFor(ids: string[]): Settle[] {
  return ids.map((id) => {
    const it = itemById.get(id)
    if (it) return { kind: 'item' as const, id, text: it.text, answers: it.answers }
    const r = readingById.get(id)
    return { kind: 'reading' as const, id, text: r ? `${r.name} (${r.unit})` : id }
  })
}

export const isStressorId = (x: string): x is StressorId => stressorById.has(x as StressorId)
