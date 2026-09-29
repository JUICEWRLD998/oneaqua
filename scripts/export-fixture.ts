// Exports REAL engine output for the scenario reach to ui-loops/fixture.json (the UI sketches render this,
// never lorem). Deterministic: re-running produces identical bytes.
import fs from 'node:fs'
import { catalogue, checkupItems, readingRuleSet } from '../engine/catalogue'
import { scenario } from '../engine/scenario'
import { diagnose, prescribe, outcome, followup } from '../engine/index'
import casebook from '../data/d24/casebook.json'

const dx = diagnose(catalogue, scenario.checkups.filter((c) => c.date < scenario.diagnosisCutoff), checkupItems, readingRuleSet, [])
const plan = scenario.plans.firstline
const naive = scenario.plans.naive

const outcomes = [
  ['4.2.2', 'odour'], ['4.2.2', 'clarity'], ['4.2.2', 'algae'], ['4.1.1', 'riparian-cover'],
].map(([m, i]) => outcome(catalogue, plan, m!, i!, scenario.checkups, scenario.asOf))
const confounded = outcome(catalogue, plan, '4.2.2', 'odour', scenario.checkupsControlMoved, scenario.asOf)

type Case = { id: string; name: string; page: number; stressorsReported: string[]; measures: { measureId: string; order: number }[] }
const emscher = (casebook as unknown as Case[]).find((c) => c.id === '5.1.2')!
const seen = new Set<string>()
const emscherPlan = {
  id: 'emscher', name: emscher.name, impactReachId: 'vale-impact', overrides: [],
  measures: [...emscher.measures].sort((a, b) => a.order - b.order).filter((m) => !seen.has(m.measureId) && seen.add(m.measureId))
    .map((m) => ({ measureId: m.measureId, objective: { specific: 'as reported in D2.4', indicator: 'odour', measurable: 1, timeBound: '2030-01-01' } })),
}
const emDx = diagnose(catalogue, [], checkupItems, readingRuleSet, [])
for (const s of emscher.stressorsReported) (emDx as any)[s] = { status: 'CONFIRMED', evidence: [], settleWith: [] }

const out = {
  _label: scenario._label,
  asOf: scenario.asOf,
  site: scenario.site,
  reaches: scenario.reaches,
  stressors: catalogue.stressors.map((s) => ({ id: s.id, name: s.name, firstLine: s.firstLine, page: s.page, status: dx[s.id].status, evidenceCount: dx[s.id].evidence.length, settleWith: dx[s.id].settleWith })),
  measures: catalogue.measures.map((m) => ({ id: m.id, name: m.name, line: m.line, page: m.page, addresses: m.addresses })),
  rules: catalogue.rules.map((r) => ({ id: r.id, name: r.name, page: r.page, quote: r.quote })),
  naivePlan: { plan: naive, assessment: prescribe(catalogue, dx, naive) },
  firstlinePlan: { plan, assessment: prescribe(catalogue, dx, plan) },
  followup: followup(catalogue, plan, scenario.checkups, scenario.asOf),
  outcomes,
  confoundedOutcome: confounded,
  checkupCounts: {
    impact: scenario.checkups.filter((c) => c.reachId === 'vale-impact').length,
    control: scenario.checkups.filter((c) => c.reachId === 'vale-control').length,
  },
  emscher: { name: emscher.name, page: emscher.page, plan: emscherPlan, assessment: prescribe(catalogue, emDx, emscherPlan) },
}
fs.mkdirSync('ui-loops', { recursive: true })
fs.writeFileSync('ui-loops/fixture.json', JSON.stringify(out, null, 2) + '\n')
console.log('fixture.json written:', out.stressors.filter((s) => s.status !== 'NOT_ASSESSED').length, 'diagnosed stressors,', outcomes.map((o) => o.verdict).join('/'), '+ confounded', confounded.verdict)
