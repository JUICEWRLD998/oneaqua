#!/usr/bin/env node
// Deterministic generator for data/scenario/vale-reach.json. EVERY record is provenance "scenario":
// invented for the demo, never presented as field data. Re-run to reproduce byte-identically.
import fs from 'node:fs'

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
const rnd = mulberry32(20260929)
const clamp = (v) => Math.max(1, Math.min(5, Math.round(v)))
const val = (base) => clamp(base + (rnd() - 0.5) * 1.6)

const IMPACT = 'vale-impact'
const CONTROL = 'vale-control'
const OBS = ['obs-a', 'obs-b', 'obs-c']
const BUILD_SEWER = '2025-09-01' // 4.2.2 point-source / sewer improvement finished
const BUILD_RIPARIAN = '2026-03-15' // 4.1.1 passive riparian regeneration started

// [date, phase] schedule: monthly-ish check-ups, control visited 3 days later by a different observer
const dates = [
  '2025-01-15', '2025-02-14', '2025-03-15', '2025-04-14', '2025-05-15', '2025-06-14', '2025-07-15', '2025-08-14',
  '2025-10-15', '2025-11-14', '2025-12-15', '2026-01-14', '2026-02-14', '2026-03-16', '2026-04-15', '2026-05-15',
  '2026-06-14', '2026-07-15', '2026-08-14', '2026-09-15',
]
const addDays = (iso, n) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10)

// baseline diagnosis answers (before works): two independent observers report the same pressures
const BASELINE_ANSWERS = {
  [IMPACT]: [
    { 'ci-odour': 'strongly', 'ci-clarity': 'very cloudy or discoloured', 'ci-riparian-trees': '1 - 0-20%' },
    { 'ci-odour': 'strongly', 'ci-litter': 'a lot', 'ci-riparian-trees': '1 - 0-20%' },
  ],
}

function build(controlMoves) {
  const out = []
  let n = 0
  dates.forEach((date, i) => {
    const afterSewer = date >= BUILD_SEWER
    const afterRip = date >= BUILD_RIPARIAN
    const impact = {
      odour: val(afterSewer ? 4 : 2), clarity: val(afterSewer ? 4 : 2), algae: val(afterSewer ? 3.6 : 2),
      'riparian-cover': val(afterRip ? 2.1 : 2), 'bank-stability': val(3), litter: val(afterSewer ? 3.4 : 2),
    }
    const c = controlMoves && afterSewer ? 4 : 2
    const control = {
      odour: val(c), clarity: val(c), algae: val(controlMoves && afterSewer ? 3.6 : 2),
      'riparian-cover': val(2), 'bank-stability': val(3), litter: val(2),
    }
    const idx = i < 2 ? i : -1
    out.push({
      id: `ck-${String(++n).padStart(3, '0')}`, reachId: IMPACT, date, observer: OBS[i % 3], provenance: 'scenario',
      answers: idx >= 0 ? BASELINE_ANSWERS[IMPACT][idx] : {}, indicators: impact,
    })
    out.push({
      id: `ck-${String(++n).padStart(3, '0')}`, reachId: CONTROL, date: addDays(date, 3), observer: OBS[(i + 1) % 3], provenance: 'scenario',
      answers: {}, indicators: control,
    })
  })
  return out
}

const scenario = {
  _label: 'SCENARIO · not field records. Invented for the Firstline demo; every check-up carries provenance "scenario".',
  asOf: '2026-09-29',
  site: { name: 'Vale reach (scenario)', note: 'A fictional urban stream reach with a paired control reach upstream of the outfall. Not a real site.' },
  reaches: [
    { id: IMPACT, role: 'impact', name: 'Vale · impact reach', lat: 40.2033, lon: -8.4103 },
    { id: CONTROL, role: 'control', name: 'Vale · control reach', lat: 40.2081, lon: -8.4062 },
  ],
  diagnosisCutoff: BUILD_SEWER,
  checkups: build(false),
  checkupsControlMoved: build(true),
  plans: {
    naive: {
      id: 'vale-naive', name: 'Re-meander the channel', impactReachId: IMPACT, controlReachId: CONTROL, overrides: [],
      measures: [{ measureId: '4.3.3', objective: { specific: 'Restore a meandering planform on the impact reach', indicator: 'bank-stability', measurable: 1, timeBound: '2028-06-30' } }],
    },
    firstline: {
      id: 'vale-firstline', name: 'Sewer first, then riparian, then re-meander', impactReachId: IMPACT, controlReachId: CONTROL, overrides: [],
      measures: [
        { measureId: '4.2.2', implementedOn: BUILD_SEWER, objective: { specific: 'Remove the sewage odour and discolouration at the outfall', indicator: 'odour', measurable: 1, timeBound: '2026-09-30' } },
        { measureId: '4.1.1', implementedOn: BUILD_RIPARIAN, objective: { specific: 'Let riparian cover regenerate on both banks', indicator: 'riparian-cover', measurable: 1, timeBound: '2029-06-30' } },
        { measureId: '4.3.3', objective: { specific: 'Restore a meandering planform once water quality is secured', indicator: 'bank-stability', measurable: 1, timeBound: '2029-12-31' } },
      ],
    },
  },
}
fs.mkdirSync('data/scenario', { recursive: true })
fs.writeFileSync('data/scenario/vale-reach.json', JSON.stringify(scenario, null, 2) + '\n')
console.log('vale-reach.json:', scenario.checkups.length, 'check-ups per variant')
