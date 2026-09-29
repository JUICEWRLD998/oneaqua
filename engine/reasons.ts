import type { Catalogue, MeasureId, Reason, RuleId } from './types'

/** TEST HOOK: a listed rule's check is skipped. Lets mutation tests prove each control depends on its rule. */
export interface EngineOptions {
  disabledRules?: RuleId[]
}

export function ruleDisabled(opts: EngineOptions | undefined, rule: RuleId): boolean {
  return opts?.disabledRules?.includes(rule) ?? false
}

/** Build a Reason whose page and quote come from the catalogue's rule table. Throws if the rule is missing. */
export function reasonFor(cat: Catalogue, rule: RuleId, plain: string, instead?: MeasureId[]): Reason {
  const def = cat.rules.find((r) => r.id === rule)
  if (!def) throw new Error(`rule ${rule} is not in the catalogue`)
  const reason: Reason = { rule, page: def.page, quote: def.quote, plain }
  if (instead !== undefined) reason.instead = instead
  return reason
}
