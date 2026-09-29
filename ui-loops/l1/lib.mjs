// Shared model + fragments for the three sketches. Every number and verdict comes from ui-loops/fixture.json
// (real engine output) or from the repo's own D2.4 data files. Nothing here is typed in by hand except labels.
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const rd = (p) => JSON.parse(fs.readFileSync(resolve(here, p), 'utf8'))
export const F = rd('../fixture.json')
const MEAS = rd('../../data/d24/measures.json')
const STR = rd('../../data/d24/stressors.json')
const ITEMS = rd('../../data/items/checkup-items.json')
const IND = rd('../../data/items/indicators.json')

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
export const n1 = (x) => (Math.round(x * 100) / 100).toFixed(2)
export const sign = (x) => (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x).toFixed(2)
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const dLong = (iso) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MON[m - 1]} ${y}` }
const dayNum = (iso) => Date.UTC(...iso.split('-').map((v, i) => (i === 1 ? +v - 1 : +v))) / 86400000

// ---------- model ----------
const byId = (a) => Object.fromEntries(a.map((x) => [x.id, x]))
export const measById = Object.fromEntries(F.measures.map((m) => [m.id, { ...m, ...byId(MEAS)[m.id], name: m.name }]))
export const ruleById = byId(F.rules)
export const indById = byId(IND)
export const itemById = byId(ITEMS)
const strById = byId(STR)

export const LINES = [
  { id: 'L1', name: 'First line', tag: 'essential', page: 19, gloss: 'Address dominant pressures and secure minimum ecological conditions' },
  { id: 'L2', name: 'Second line', tag: 'structural', page: 20, gloss: 'Restore physical habitat, morphology and connectivity' },
  { id: 'L3', name: 'Third line', tag: 'social', page: 20, gloss: 'Embed rehabilitation in governance and stewardship' },
  { id: 'L4', name: 'Fourth line', tag: 'complementary', page: 20, gloss: 'Consolidate gains; manage secondary symptoms' },
  { id: 'C-hydro', name: 'Compensatory', tag: 'hydrological', page: 21, gloss: 'Options of last resort (R4)' },
  { id: 'C-chem', name: 'Compensatory', tag: 'chemical', page: 21, gloss: 'Options of last resort (R4)' },
].map((l) => ({ ...l, count: F.measures.filter((m) => m.line === l.id).length }))

export const label = F._label
export const asOf = F.asOf
export const site = F.site
export const impact = F.reaches.find((r) => r.role === 'impact')
export const control = F.reaches.find((r) => r.role === 'control')
export const counts = F.checkupCounts

// great-circle distance between the two reach reference points (derived from the fixture coordinates)
export const reachDistanceM = (() => {
  const R = 6371000, rad = (d) => (d * Math.PI) / 180
  const dLat = rad(impact.lat - control.lat), dLon = rad(impact.lon - control.lon)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(control.lat)) * Math.cos(rad(impact.lat)) * Math.sin(dLon / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(a)))
})()

export const stressors = F.stressors.map((s) => ({
  ...s,
  d24Text: strById[s.id]?.d24Text ?? '',
  settle: s.settleWith.map((id) => ({ id, text: itemById[id]?.text ?? id, answers: itemById[id]?.answers ?? [] })),
}))
export const STATUS = { CONFIRMED: 'Confirmed', SUSPECTED: 'Suspected', NOT_ASSESSED: 'Not assessed' }
export const statusCount = (k) => stressors.filter((s) => s.status === k).length

const planVerdict = (assessment, id) => assessment.measures.find((m) => m.measureId === id)?.verdict
export const firstline = {
  name: F.firstlinePlan.plan.name,
  verdict: F.firstlinePlan.assessment.verdict,
  measures: F.firstlinePlan.plan.measures.map((pm) => ({
    ...measById[pm.measureId],
    verdict: planVerdict(F.firstlinePlan.assessment, pm.measureId),
    implementedOn: pm.implementedOn ?? null,
    objective: pm.objective,
  })),
}
const nReason = F.naivePlan.assessment.measures[0].reasons[0]
export const refusal = {
  planName: F.naivePlan.plan.name,
  planVerdict: F.naivePlan.assessment.verdict,
  measure: measById[F.naivePlan.assessment.measures[0].measureId],
  verdict: F.naivePlan.assessment.measures[0].verdict,
  rule: ruleById[nReason.rule],
  reason: nReason,
  instead: nReason.instead.map((id) => measById[id]),
  uncovered: F.naivePlan.assessment.uncovered,
  objective: F.naivePlan.plan.measures[0].objective,
}
export const insteadInPlan = (id) => firstline.measures.some((m) => m.id === id)

export const outcomes = F.outcomes.map((o) => ({
  ...o,
  measure: measById[o.measureId],
  indicatorName: indById[o.indicator]?.name ?? o.indicator,
  scale: indById[o.indicator]?.scale ?? { min: 1, max: 5 },
}))
export const oOdour = outcomes.find((o) => o.measureId === '4.2.2' && o.indicator === 'odour')
export const oNyk = outcomes.find((o) => o.verdict === 'NOT_YET_KNOWABLE')
export const oConf = { ...F.confoundedOutcome, measure: measById['4.2.2'], indicatorName: indById.odour.name, scale: indById.odour.scale }
export const nykImpl = firstline.measures.find((m) => m.id === oNyk.measureId).implementedOn
export const lag = (() => {
  const a = dayNum(nykImpl), b = dayNum(oNyk.knowableFrom), t = dayNum(asOf)
  return { totalDays: b - a, doneDays: t - a, leftDays: b - t, frac: (t - a) / (b - a) }
})()
export const followup = F.followup.items.map((it) => ({ ...it, measure: measById[it.measureId], indicatorName: indById[it.indicator]?.name ?? it.indicator }))
export const emscher = (() => {
  const ms = F.emscher.assessment.measures
  const tally = {}
  for (const m of ms) tally[m.verdict] = (tally[m.verdict] || 0) + 1
  return { name: F.emscher.name, page: F.emscher.page, verdict: F.emscher.assessment.verdict, total: ms.length, tally }
})()
export const nameOf = (id) => measById[id]?.name ?? id
export const short = (id) => nameOf(id).replace(/^Passive riparian vegetation: /, 'Passive riparian: ')

// ---------- citation chip ----------
let citeN = 0
export function cite(page, quote, who, opts = {}) {
  const id = `q${++citeN}`
  const cls = opts.cls ? ` ${opts.cls}` : ''
  return `<span class="cite${cls}"><button type="button" class="chip" aria-expanded="false" aria-describedby="${id}">D2.4 · p.${page}</button><span class="cite-quote" role="tooltip" id="${id}"><q>${esc(quote)}</q><span class="cite-src">D2.4 · p.${page} · ${esc(who)}</span></span></span>`
}
export const citeRule = (r, opts) => cite(r.page, r.quote, `${r.rule ?? r.id} ${ruleById[r.rule ?? r.id]?.name ?? ''}`.trim(), opts)

// ---------- verdict vocabulary (shape + word, never colour alone) ----------
export const VSHAPE = {
  CONFIRMED: '<path d="M6 1.5 L11 10.5 H1 Z" />',
  SUSPECTED: '<path d="M6 1 L11 6 L6 11 L1 6 Z" />',
  NOT_ASSESSED: '<circle cx="6" cy="6" r="4.2" fill="none" stroke-width="1.6" stroke-dasharray="2.2 1.6" />',
  CONTRAINDICATED: '<path d="M2 2 L10 10 M10 2 L2 10" fill="none" stroke-width="2.2" />',
  IMPROVED: '<path d="M1.5 6.5 L4.8 9.5 L10.5 2.5" fill="none" stroke-width="2.2" />',
  NOT_YET_KNOWABLE: '<circle cx="6" cy="6" r="4.2" fill="none" stroke-width="1.4" /><path d="M6 3.4 V6.2 L7.8 7.2" fill="none" stroke-width="1.2" />',
  CONFOUNDED: '<circle cx="4.2" cy="6" r="3.2" fill="none" stroke-width="1.5" /><circle cx="7.8" cy="6" r="3.2" fill="none" stroke-width="1.5" />',
  INDICATED: '<path d="M1.5 6.5 L4.8 9.5 L10.5 2.5" fill="none" stroke-width="2.2" />',
  BLOCKED: '<path d="M2 2 L10 10 M10 2 L2 10" fill="none" stroke-width="2.2" />',
  SIGNABLE: '<path d="M1.5 6.5 L4.8 9.5 L10.5 2.5" fill="none" stroke-width="2.2" />',
}
const VMARK = { CONFIRMED: 'confirmed', SUSPECTED: 'suspected', NOT_ASSESSED: 'notassessed', CONTRAINDICATED: 'contra', IMPROVED: 'improved', NOT_YET_KNOWABLE: 'nyk', CONFOUNDED: 'confounded', INDICATED: 'improved', BLOCKED: 'contra', SIGNABLE: 'improved' }
export const VLABEL = { CONFIRMED: 'Confirmed', SUSPECTED: 'Suspected', NOT_ASSESSED: 'Not assessed', CONTRAINDICATED: 'Contraindicated', IMPROVED: 'Improved', NOT_YET_KNOWABLE: 'Not yet knowable', CONFOUNDED: 'Confounded', INDICATED: 'Indicated', BLOCKED: 'Blocked', SIGNABLE: 'Signable' }
export function vmark(v, { text = true, cls = '' } = {}) {
  const k = VMARK[v]
  const glyph = VSHAPE[v]
  if (!k || !glyph) return `<span class="verdict ${cls}">${esc(VLABEL[v] ?? v)}</span>`
  return `<span class="verdict v-${k} ${cls}"><svg class="vg" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false">${glyph}</svg>${text ? `<span>${esc(VLABEL[v])}</span>` : ''}</span>`
}

// ---------- BACI figures (real cells, real CI) ----------
const fx = (v) => v.toFixed(1)
export function baciPlot(o, { id = 'plot', w = 300, h = 290 } = {}) {
  const c = o.cells
  const yMin = o.scale.min, yMax = o.scale.max
  const top = 26, bot = h - 40, left = 44, right = w - 20
  const Y = (v) => bot - ((v - yMin) / (yMax - yMin)) * (bot - top)
  const xB = left + (right - left) * 0.24, xA = left + (right - left) * 0.72
  const cB = c.beforeControl, cA = c.afterControl, iB = c.beforeImpact, iA = c.afterImpact
  const cf = iB.mean + (cA.mean - cB.mean)
  let s = `<svg class="baci baci-plot" data-v="${o.verdict}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="${id}-t ${id}-d" focusable="false">`
  s += `<title id="${id}-t">Before and after means, control and impact reach</title>`
  s += `<desc id="${id}-d">${esc(o.measure.name)}, ${esc(o.indicatorName)}. Control ${n1(cB.mean)} to ${n1(cA.mean)}. Impact ${n1(iB.mean)} to ${n1(iA.mean)}.${o.contrast !== undefined ? ` Contrast ${n1(o.contrast)}.` : ''}</desc>`
  for (let v = yMin; v <= yMax; v++) s += `<line class="b-grid" x1="${left}" x2="${right}" y1="${Y(v)}" y2="${Y(v)}"/><text class="b-tick" x="${left - 8}" y="${Y(v) + 4}" text-anchor="end">${v}</text>`
  s += `<line class="b-axis" x1="${left}" x2="${left}" y1="${top - 6}" y2="${bot}"/>`
  s += `<text class="b-cap" x="${xB}" y="${h - 16}" text-anchor="middle">Before</text><text class="b-cap" x="${xA}" y="${h - 16}" text-anchor="middle">After</text>`
  s += `<line class="b-ctl" x1="${xB}" y1="${Y(cB.mean)}" x2="${xA}" y2="${Y(cA.mean)}"/>`
  if (o.contrast !== undefined) {
    s += `<line class="b-cf" x1="${xB}" y1="${Y(iB.mean)}" x2="${xA}" y2="${Y(cf)}"/>`
    const bx = xA + 22
    s += `<path class="b-contrast" d="M${bx - 5} ${Y(cf)} H${bx} V${Y(iA.mean)} H${bx - 5}"/>`
    s += `<text class="b-num" x="${bx + 7}" y="${(Y(cf) + Y(iA.mean)) / 2 + 4}">${sign(o.contrast)}</text>`
  }
  s += `<line class="b-imp" x1="${xB}" y1="${Y(iB.mean)}" x2="${xA}" y2="${Y(iA.mean)}"/>`
  const cell = (x, cellO, k, dy) => {
    const y = Y(cellO.mean)
    const mark = k === 'i' ? `<circle class="b-pt b-pt-i" cx="${x}" cy="${y}" r="5.5"/>` : `<rect class="b-pt b-pt-c" x="${x - 5}" y="${y - 5}" width="10" height="10"/>`
    return `${mark}<text class="b-n" x="${x}" y="${y + dy}" text-anchor="middle">n ${cellO.n}</text>`
  }
  // label offsets keep n labels off the lines
  const impAbove = iA.mean >= cA.mean
  s += cell(xB, cB, 'c', iB.mean === cB.mean ? 20 : (cB.mean < iB.mean ? 20 : -12))
  s += cell(xB, iB, 'i', iB.mean === cB.mean ? -12 : (iB.mean < cB.mean ? 20 : -12))
  s += cell(xA, cA, 'c', impAbove ? 20 : -12)
  s += cell(xA, iA, 'i', impAbove ? -12 : 20)
  s += `<text class="b-key" x="${right}" y="${top - 10}" text-anchor="end">${fx(yMin)} to ${fx(yMax)} scale</text>`
  s += '</svg>'
  return s
}

export function baciContrast(o, { id = 'contrast', w = 300, h = 150 } = {}) {
  const lo = -1, hi = 3
  const left = 22, right = w - 22
  const X = (v) => left + ((v - lo) / (hi - lo)) * (right - left)
  const y = 66
  const d = o.delta
  let s = `<svg class="baci baci-contrast" data-v="${o.verdict}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="${id}-t ${id}-d" focusable="false">`
  s += `<title id="${id}-t">Contrast with its ${Math.round(o.ci.level * 100)}% interval against the delta band</title>`
  s += `<desc id="${id}-d">Contrast ${n1(o.contrast)}, interval ${n1(o.ci.low)} to ${n1(o.ci.high)}, delta ${d}.</desc>`
  s += `<rect class="b-band" x="${X(-d)}" y="${y - 30}" width="${X(d) - X(-d)}" height="60"/>`
  for (let v = lo; v <= hi; v++) s += `<line class="b-grid" x1="${X(v)}" x2="${X(v)}" y1="${y + 30}" y2="${y + 36}"/><text class="b-tick" x="${X(v)}" y="${y + 52}" text-anchor="middle">${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)}</text>`
  s += `<line class="b-axis" x1="${left}" x2="${right}" y1="${y + 30}" y2="${y + 30}"/>`
  s += `<line class="b-zero" x1="${X(0)}" x2="${X(0)}" y1="${y - 36}" y2="${y + 30}"/>`
  s += `<text class="b-key" x="${X(0)}" y="${y - 42}" text-anchor="middle">no change</text>`
  s += `<text class="b-key" x="${X(d) + 4}" y="${y - 12}" >delta = ${d}</text>`
  s += `<line class="b-whisker" x1="${X(o.ci.low)}" x2="${X(o.ci.high)}" y1="${y + 8}" y2="${y + 8}"/>`
  s += `<line class="b-whisker" x1="${X(o.ci.low)}" x2="${X(o.ci.low)}" y1="${y + 1}" y2="${y + 15}"/><line class="b-whisker" x1="${X(o.ci.high)}" x2="${X(o.ci.high)}" y1="${y + 1}" y2="${y + 15}"/>`
  s += `<circle class="b-est" cx="${X(o.contrast)}" cy="${y + 8}" r="5.5"/>`
  s += `<text class="b-num" x="${X(o.contrast)}" y="${y - 10}" text-anchor="middle">${sign(o.contrast)}</text>`
  s += `<text class="b-key" x="${left}" y="${h - 6}">${Math.round(o.ci.level * 100)}% interval ${sign(o.ci.low)} to ${sign(o.ci.high)}</text>`
  s += '</svg>'
  return s
}

export function lagBar(o, { id = 'lag', w = 300, h = 96 } = {}) {
  const left = 12, right = w - 12
  const X = (f) => left + f * (right - left)
  let s = `<svg class="baci baci-lag" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="${id}-t ${id}-d" focusable="false">`
  s += `<title id="${id}-t">Response lag window</title><desc id="${id}-d">Built ${nykImpl}. Knowable from ${o.knowableFrom}. Today is ${asOf}.</desc>`
  s += `<line class="b-lag" x1="${X(0)}" x2="${X(1)}" y1="40" y2="40"/>`
  s += `<line class="b-lag-done" x1="${X(0)}" x2="${X(lag.frac)}" y1="40" y2="40"/>`
  s += `<line class="b-whisker" x1="${X(0)}" x2="${X(0)}" y1="30" y2="50"/><line class="b-whisker" x1="${X(1)}" x2="${X(1)}" y1="30" y2="50"/>`
  s += `<path class="b-today" d="M${X(lag.frac)} 24 V56"/>`
  s += `<text class="b-key" x="${X(0)}" y="72">built ${nykImpl}</text>`
  s += `<text class="b-key" x="${X(1)}" y="72" text-anchor="end">knowable ${o.knowableFrom}</text>`
  s += `<text class="b-key" x="${X(lag.frac) + 6}" y="20">${asOf}</text>`
  s += '</svg>'
  return s
}

// ---------- shared behaviour: chip (hover / focus / tap) and the keyboard "place measure" control ----------
export const placeOptions = () => LINES.map((l) => `<optgroup label="${esc(l.name)} · ${esc(l.tag)}">${F.measures.filter((m) => m.line === l.id).map((m) => `<option value="${m.id}" data-line="${m.line}">${m.id} ${esc(m.name)}</option>`).join('')}</optgroup>`).join('')

export function placeVerdicts() {
  const o = {}
  for (const m of firstline.measures) o[m.id] = { verdict: m.verdict, plan: 'Sewer first' }
  o[refusal.measure.id] = { verdict: 'CONTRAINDICATED', plan: 'Re-meander the channel', rule: 'R1', page: 19 }
  return o
}

export const SCRIPT = `
(function(){
  var cites=[].slice.call(document.querySelectorAll('.cite'));
  function place(c){var q=c.querySelector('.cite-quote');c.classList.remove('flip');var r=q.getBoundingClientRect();if(r.right>window.innerWidth-12)c.classList.add('flip');}
  function setOpen(c,on){var b=c.querySelector('.chip');if(on){c.setAttribute('data-open','');b.setAttribute('aria-expanded','true');place(c);}else{c.removeAttribute('data-open');b.setAttribute('aria-expanded','false');}}
  cites.forEach(function(c){
    var b=c.querySelector('.chip');
    b.addEventListener('click',function(e){e.stopPropagation();var on=!c.hasAttribute('data-open');cites.forEach(function(x){setOpen(x,false)});setOpen(c,on);});
    b.addEventListener('focus',function(){c.setAttribute('data-focus','');place(c);});
    b.addEventListener('blur',function(){c.removeAttribute('data-focus');});
    c.addEventListener('mouseenter',function(){place(c);});
  });
  document.addEventListener('click',function(){cites.forEach(function(x){setOpen(x,false)});});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'){cites.forEach(function(x){setOpen(x,false)});}});
  var form=document.querySelector('[data-place]');
  if(form){
    var V=JSON.parse(document.getElementById('place-data').textContent);
    var sel=form.querySelector('select'),out=form.querySelector('output');
    form.addEventListener('submit',function(e){
      e.preventDefault();
      var opt=sel.options[sel.selectedIndex];var id=sel.value;
      var line=opt.getAttribute('data-line');
      var v=V[id];
      var msg=id+' placed on the ladder. '+(v?(v.verdict==='CONTRAINDICATED'?'Refused by '+v.rule+' \\u00b7 D2.4 p.'+v.page+' when it is the first measure in the plan: see the refusal.':'Engine verdict in the plan "'+v.plan+'": '+v.verdict.toLowerCase()+'.'):'Verdict not computed in this sketch: the engine call is wired in the next loop.');
      out.textContent=msg;
      var host=document.querySelector('[data-rung-list="'+line+'"]');
      if(host){var li=document.createElement('li');li.className='placed-user';li.textContent=opt.textContent+' \\u00b7 placed by you \\u00b7 '+(v?v.verdict.toLowerCase():'verdict pending');host.appendChild(li);}
    });
  }
})();`
