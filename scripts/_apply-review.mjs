// One-off, kept for the record: applies the evidence-backed should-fix items from evidence/review-d24.md.
import fs from 'node:fs'
const rd = p => JSON.parse(fs.readFileSync(p, 'utf8'))
const wr = (p, o) => fs.writeFileSync(p, JSON.stringify(o, null, 2) + '\n')

const M = rd('data/d24/measures.json')
const add = (id, ...s) => { const m = M.find(x => x.id === id); for (const x of s) if (!m.addresses.includes(x)) m.addresses.push(x); m.addresses.sort() }
add('4.2.2', 'S03')                                                   // #2
for (const id of ['4.6.1', '4.6.3', '4.6.4', '4.6.5', '4.6.6', '4.6.7']) add(id, 'S01', 'S12') // #5 #6
add('4.1.3', 'S01')                                                   // #7
M.find(x => x.id === '4.1.4').addresses = []                          // #8
add('4.3.3', 'S03', 'S08'); add('4.3.8', 'S08', 'S06'); add('4.3.17', 'S07') // #9 #11 #14
const b = M.find(x => x.id === '4.3.20'); b.responseLag = 'fast'; delete b.establishmentYears // #18
for (const id of ['4.1.1', '4.1.2', '4.1.3', '4.1.4']) delete M.find(x => x.id === id).establishmentYears // #19
wr('data/d24/measures.json', M)

const C = rd('data/d24/casebook.json')
for (const id of ['5.1.4', '5.1.5']) { const x = C.find(y => y.id === id); x.afterMonitoringReported = null } // #20 #21
const e = C.find(x => x.id === '5.1.2')
const drop = new Set(['retention basin creation', 'the blocking of drainage ditches to restore groundwater levels'])
const keep = e.unmapped.map((s, i) => [s, e.unmappedPages?.[i]]).filter(([s]) => !drop.has(s))
e.unmapped = keep.map(k => k[0]); if (e.unmappedPages) e.unmappedPages = keep.map(k => k[1])
e.measures.push(
  { measureId: '4.2.2', order: 8, orderBasis: 'mention-order', page: 113, quote: 'the blocking of drainage ditches to restore groundwater levels' },
  { measureId: '4.6.7', order: 9, orderBasis: 'mention-order', page: 113, quote: 'retention basin creation' },
  { measureId: '4.4.3', order: 10, orderBasis: 'mention-order', page: 113, quote: 'broad-based participation process promoted by EGLV' })
wr('data/d24/casebook.json', C)

const I = rd('data/items/checkup-items.json')
const d = I.find(x => x.id === 'ci-dry-areas'); d.evidence = d.evidence.filter(v => v.stressor !== 'S03') // #30
d.source = d.source.replace('p.13', 'p.12')
wr('data/items/checkup-items.json', I)
