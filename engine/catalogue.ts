import type { Catalogue, CheckupItem, Indicator, Measure, ReadingRule, RuleDef, RuleParams, Stressor } from './types'
import stressors from '../data/d24/stressors.json'
import measures from '../data/d24/measures.json'
import rules from '../data/d24/rules.json'
import indicators from '../data/items/indicators.json'
import items from '../data/items/checkup-items.json'
import readingRules from '../data/items/reading-rules.json'

/** The encoded D2.4 catalogue. Every fact carries a printed-page cite, verified by scripts/verify-d24-cites.mjs. */
export const catalogue: Catalogue = {
  stressors: stressors as unknown as Stressor[],
  measures: measures as unknown as Measure[],
  rules: (rules as unknown as { rules: RuleDef[] }).rules,
  params: (rules as unknown as { params: RuleParams }).params,
  indicators: indicators as unknown as Indicator[],
}

export const checkupItems: CheckupItem[] = items as unknown as CheckupItem[]
export const readingRuleSet: ReadingRule[] = readingRules as unknown as ReadingRule[]
