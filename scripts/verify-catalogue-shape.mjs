#!/usr/bin/env node
// Structural checks on the encoded catalogue. Zero npm dependencies.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const DATA = join(dirname(fileURLToPath(import.meta.url)), '..', 'data')
const load = p => JSON.parse(readFileSync(join(DATA, p), 'utf8'))
const stressors = load('d24/stressors.json')
const measures = load('d24/measures.json')
const { rules, params } = load('d24/rules.json')
const casebook = load('d24/casebook.json')
const indicators = load('items/indicators.json')
const items = load('items/checkup-items.json')
const readingRules = load('items/reading-rules.json')

const fails = []
const ok = (cond, msg) => { if (!cond) fails.push(msg) }
const words = s => s.trim().split(/\s+/).length
const LINES = ['L1', 'L2', 'L3', 'L4', 'C-hydro', 'C-chem']
const LAGS = ['fast', 'medium', 'slow']

// stressors
ok(stressors.length === 12, `want 12 stressors, got ${stressors.length}`)
const sids = new Set(stressors.map(s => s.id))
ok(sids.size === 12 && [...Array(12)].every((_, i) => sids.has('S' + String(i + 1).padStart(2, '0'))), 'stressor ids must be S01..S12, unique')
stressors.forEach(s => {
  ok(typeof s.firstLine === 'boolean' && typeof s.citizenObservable === 'boolean', `${s.id}: firstLine/citizenObservable must be boolean`)
  ok(s.page >= 1 && s.page <= 150 && s.d24Text && s.name, `${s.id}: missing page/text/name`)
})
ok(JSON.stringify(stressors.filter(s => s.firstLine).map(s => s.id)) === '["S01","S07"]', 'firstLine must be exactly S01, S07 (S03 is "where feasible" on D2.4 p.19, see DECISIONS)')

// indicators
const iids = new Set(indicators.map(i => i.id))
ok(iids.size === indicators.length, 'indicator ids must be unique')
indicators.forEach(i => {
  ok(i.scale.min === 1 && i.scale.max === 5, `${i.id}: scale must be 1..5`)
  ok(i.delta > 0 && LAGS.includes(i.responseLag) && typeof i.citizenObservable === 'boolean' && i.source, `${i.id}: bad delta/lag/source`)
  ok(/Firstline declared parameter \(1 class unit\); not a D2.4 number/.test(i.source), `${i.id}: source must flag delta as a declared parameter`)
})

// measures
ok(measures.length === 43, `want 43 measures, got ${measures.length}`)
const mids = new Set(measures.map(m => m.id))
ok(mids.size === 43, 'measure ids must be unique')
const expectedIds = [4, 3, 21, 4, 1, 7, 3].flatMap((n, i) => Array.from({ length: n }, (_, k) => `4.${i + 1}.${k + 1}`))
ok(expectedIds.length === 43 && expectedIds.every(id => mids.has(id)), 'measure ids must be exactly 4.1.1-4.1.4, 4.2.1-3, 4.3.1-21, 4.4.1-4, 4.5.1, 4.6.1-7, 4.7.1-3')
const lineFor = id => ({ 1: 'L1', 2: 'L1', 3: 'L2', 4: 'L3', 5: 'L4', 6: 'C-hydro', 7: 'C-chem' })[id.split('.')[1]]
measures.forEach(m => {
  ok(LINES.includes(m.line), `${m.id}: invalid line ${m.line}`)
  ok(m.line === lineFor(m.id), `${m.id}: line ${m.line} does not follow the section heading`)
  ok(Number.isInteger(m.page) && m.page >= 1 && m.page <= 150, `${m.id}: page out of range`)
  ok(Array.isArray(m.addresses) && m.addresses.every(a => sids.has(a)), `${m.id}: addresses must be existing stressor ids`)
  ok(Array.isArray(m.citizenMonitorable) && m.citizenMonitorable.every(c => iids.has(c)), `${m.id}: citizenMonitorable ids must exist in indicators.json`)
  ok(LAGS.includes(m.responseLag), `${m.id}: bad responseLag`)
  ok(m.objective && words(m.objective) <= 40, `${m.id}: objective missing or over 40 words`)
  ok(m.limitations && (m.limitations === 'not stated in D2.4' || words(m.limitations) <= 40), `${m.id}: limitations missing or over 40 words`)
  if (m.id.startsWith('4.6.')) ok(/D2\.4 p\.19 also names reduction of sealed surfaces as first-line/.test(m.note ?? ''), `${m.id}: missing the first-line tension note`)
  if (m.establishmentYears !== undefined) ok(m.establishmentYears === 3, `${m.id}: establishmentYears must be 3 when present`)
})
const est = measures.filter(m => m.establishmentYears).map(m => m.id)
ok(est.length === 9, `want 9 measures with establishmentYears (4.3.11-19; bioengineered works per D2.4 p.26), got ${est.length}`)

// rules
const want = ['R1', 'R1a', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8']
ok(want.every(id => rules.some(r => r.id === id)) && rules.length === 9, 'rules must be exactly R1, R1a, R2..R8')
rules.forEach(r => ok(r.page >= 19 && r.page <= 26 && r.quote && r.name && r.verdict, `${r.id}: needs page 19-26, quote, name, verdict`))
ok(params.r1AddressedBy.default.every(l => LINES.includes(l)), 'r1AddressedBy.default must be lines')
ok(sids.has(params.r2.stressor) && params.r2.measures.every(x => mids.has(x)), 'r2 must reference existing ids')
ok(params.r3SymptomMeasures.every(x => mids.has(x)), 'r3SymptomMeasures must exist')
ok(params.r4CompensatoryLines.every(l => LINES.includes(l)), 'r4CompensatoryLines must be lines')
LAGS.forEach(l => ok(params.r7LagDays[l] && params.r7LagDays[l].days > 0 && typeof params.r7LagDays[l].assumption === 'boolean', `r7LagDays.${l} malformed`))
ok(params.r7LagDays.slow.assumption === false && params.r7LagDays.slow.cite?.page === 26, 'r7 slow must be sourced (p.26)')
ok(params.r7LagDays.medium.assumption === true && params.r7LagDays.fast.assumption === true, 'r7 medium/fast must be flagged as assumptions')
ok(params.r7LagDays.fast.days < params.r7LagDays.medium.days && params.r7LagDays.medium.days < params.r7LagDays.slow.days, 'r7 lags must be ordered fast < medium < slow')

// casebook
ok(casebook.length >= 7, `want >= 7 case studies, got ${casebook.length}`)
casebook.forEach(c => {
  ok(c.stressorsReported.every(s => sids.has(s)), `${c.id}: unknown stressor`)
  ok(c.measures.every(m => mids.has(m.measureId) && Number.isInteger(m.order) && m.page >= 111 && m.page <= 131 && m.quote), `${c.id}: bad measure entry`)
  ok(c.baselineReported === null || typeof c.baselineReported === 'boolean', `${c.id}: baselineReported must be boolean|null`)
  ok(c.afterMonitoringReported === null || typeof c.afterMonitoringReported === 'boolean', `${c.id}: afterMonitoringReported must be boolean|null`)
  if (c.baselineReported === null) ok(c.notStated?.baselineReported, `${c.id}: null baseline needs a notStated note`)
  if (c.afterMonitoringReported === null) ok(c.notStated?.afterMonitoringReported, `${c.id}: null afterMonitoring needs a notStated note`)
})
const em = casebook.find(c => c.id === '5.1.2')
const first = em?.measures.find(m => m.measureId === '4.2.2')
ok(first && first.order === 1 && em.measures.filter(m => m.measureId.startsWith('4.3.')).every(m => m.order > first.order), 'Emscher: sewer/point-source (4.2.2) must precede every 4.3.x measure (positive control)')

// items
const stressorIdsOk = e => sids.has(e.stressor) && e.strength === 'suggest'
ok(items.length > 0, 'no check-up items')
items.forEach(it => {
  ok(it.text && it.source && it.answers.length >= 2, `${it.id}: needs text, source, >=2 answers`)
  ok(it.evidence.every(e => stressorIdsOk(e) && it.answers.includes(e.answer)), `${it.id}: evidence must be 'suggest', on a real stressor and a listed answer`)
})
ok(new Set(items.map(i => i.id)).size === items.length, 'item ids must be unique')
ok(readingRules.every(r => r.source && sids.has(r.stressor) && Number.isFinite(r.threshold)), 'every reading rule needs a source, a stressor and a numeric threshold')

if (fails.length) {
  console.log(`verify-catalogue-shape: ${fails.length} failure(s)`)
  fails.forEach(f => console.log('  FAIL ' + f))
  process.exit(1)
}
console.log(`verify-catalogue-shape: ok (stressors ${stressors.length}, measures ${measures.length}, rules ${rules.length}, indicators ${indicators.length}, casebook ${casebook.length}, check-up items ${items.length}, reading rules ${readingRules.length})`)
