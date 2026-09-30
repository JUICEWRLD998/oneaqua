// D2 Long Section: a hydrographic / engineering drawing. The reach as a longitudinal profile, the Ladder as a
// stratigraphic column, dimension-line captions for citations. Macrostructure 19 Map / Diagram · N3 side rail · Ft2.
import * as L from './lib.mjs'
const { esc, n1 } = L

// Longitudinal profile across the top. Chainage runs downstream; only facts from the scenario are drawn:
// the control point, the outfall between the reaches, the impact point, and the stressors still open on the impact reach.
function profile() {
  const W = 1000, H = 210, x0 = 70, x1 = 930
  const d = L.reachDistanceM
  const open = L.stressors.filter((s) => s.firstLine && s.status !== 'NOT_ASSESSED' || s.status === 'CONFIRMED')
  const confirmed = L.stressors.filter((s) => s.status === 'CONFIRMED')
  const cx = x0 + 40, ix = x1 - 40, ox = Math.round(cx + (ix - cx) * 0.42)
  const bed = `M${x0} 120 L${cx} 122 L${ox - 30} 126 L${ox} 130 L${ox + 40} 134 L${ix} 140 L${x1} 142`
  const tick = (x, y, label, sub) => `<g><line class="p-lead" x1="${x}" y1="${y}" x2="${x}" y2="150"/><circle class="p-pt" cx="${x}" cy="${y}" r="5"/><text class="p-t" x="${x}" y="${y - 12}" text-anchor="middle">${label}</text>${sub ? `<text class="p-s" x="${x}" y="${y - 28}" text-anchor="middle">${sub}</text>` : ''}</g>`
  return `<svg class="profile" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="pf-t pf-d">
  <title id="pf-t">Longitudinal profile of the Vale reach, scenario</title>
  <desc id="pf-d">Flow runs left to right. The control reach is upstream, then the outfall, then the impact reach, ${d} metres between the two reach points. ${confirmed.map((s) => s.id).join(' and ')} are confirmed on the impact reach.</desc>
  <path class="p-water" d="${bed} L${x1} 100 L${x0} 100 Z"/>
  <path class="p-bed" d="${bed}"/>
  ${tick(cx, 122, 'Control reach', L.control.id)}
  ${tick(ox, 130, 'Outfall', 'scenario')}
  ${tick(ix, 140, 'Impact reach', L.impact.id)}
  <g class="p-dim"><line x1="${cx}" y1="178" x2="${ix}" y2="178"/><line x1="${cx}" y1="172" x2="${cx}" y2="184"/><line x1="${ix}" y1="172" x2="${ix}" y2="184"/><text class="p-n" x="${(cx + ix) / 2}" y="172" text-anchor="middle">${d} m between reach points</text></g>
  <path class="p-flow" d="M${x0} 30 H${x0 + 70} M${x0 + 62} 25 L${x0 + 72} 30 L${x0 + 62} 35"/><text class="p-s" x="${x0 + 80}" y="34">flow</text>
  <g class="p-open">${confirmed.map((s, i) => `<g transform="translate(${ix - 10 - i * 44} 92)"><rect x="-20" y="-16" width="40" height="22" rx="0"/><text x="0" y="0" text-anchor="middle">${s.id}</text></g>`).join('')}</g>
</svg>`
}

const cite = (r) => L.citeRule(r)

export function renderD2() {
  const st = L.stressors
  const first = L.firstline.measures
  const rf = L.refusal
  const oO = L.oOdour, oN = L.oNyk, oC = L.oConf
  const alsoOn = L.outcomes.filter((o) => o.verdict === 'IMPROVED' && o !== oO)

  const log = st.map((s) => `<tr class="st-${s.status.toLowerCase()}"><th scope="row" class="num">${s.id}</th><td>${esc(s.name)}${s.firstLine ? ' <span class="fl">first line</span>' : ''}</td><td>${L.vmark(s.status)}</td><td class="why">${s.status === 'CONFIRMED' ? `<span class="num">${s.evidenceCount}</span> check-ups` : s.settle.length ? `Ask <q>${esc(s.settle[0].text)}</q>` : 'No field-form item yet'}</td></tr>`).join('')

  const strata = L.LINES.map((ln) => {
    const here = first.filter((m) => m.line === ln.id)
    const items = here.map((m) => `<li><span class="num mid">${m.id}</span><span>${esc(L.short(m.id))}</span>${L.vmark(m.verdict, { text: false })}<span class="sr">${esc(L.VLABEL[m.verdict])}</span></li>`).join('')
    const refused = ln.id === 'L2' ? refusalCallout() : ''
    return `<li class="stratum" data-line="${ln.id}"><div class="s-h"><span class="s-k num">${ln.id.startsWith('C') ? 'C' : ln.id.slice(1)}</span><span class="s-n">${esc(ln.name)} <em>${esc(ln.tag)}</em></span><span class="s-c num">${ln.count}</span></div><ul class="s-i" data-rung-list="${ln.id}">${items || '<li class="none">Nothing placed.</li>'}</ul>${refused}</li>`
  }).join('')

  function refusalCallout() {
    return `<aside class="refusal" aria-labelledby="rf-h"><div class="dimline" aria-hidden="true"></div>
      <h3 id="rf-h">${L.vmark('CONTRAINDICATED')} <span class="num">${rf.measure.id}</span> ${esc(rf.measure.name)}</h3>
      <p>${esc(rf.reason.plain)}</p>
      <p class="q"><q>${esc(rf.rule.quote)}</q> ${cite(rf.reason)}</p>
      <p class="instead">Instead: ${rf.instead.map((m) => `<span class="num">${m.id}</span> ${esc(L.short(m.id))}${L.insteadInPlan(m.id) ? ' (in the signed plan)' : ''}`).join(' · ')}</p></aside>`
  }

  const card = (o, title, body, withMeans = true) => `<article class="sect-card">
    <h3>${title}</h3>
    <p class="vl">${L.vmark(o.verdict)} ${cite(o.reasons[0])}</p>
    ${body}
    <dl class="cells-dl">${['beforeControl', 'afterControl', 'beforeImpact', 'afterImpact'].map((k) => `<div><dt>${{ beforeControl: 'Control · before', afterControl: 'Control · after', beforeImpact: 'Impact · before', afterImpact: 'Impact · after' }[k]}</dt><dd><span class="num">${withMeans ? n1(o.cells[k].mean) : 'withheld'}</span> <span class="nn">n <span class="num">${o.cells[k].n}</span></span></dd></div>`).join('')}</dl></article>`

  const sched = L.followup.map((it) => `<tr><th scope="row" class="num">${it.measureId}</th><td>${esc(it.indicatorName.split(' (')[0])}</td><td class="num">${it.design}</td><td class="num">${it.knowableFrom ?? 'not built yet'}</td><td class="num">${it.knowableFrom === null ? it.visitsNeeded.afterImpact : 0}</td></tr>`).join('')
  const rules = L.F.rules.map((r) => `<li><span class="num">${r.id}</span> ${esc(r.name)} ${cite(r)}</li>`).join('')

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<title>Stream chart, Vale reach (scenario) · Firstline</title>
<link rel="stylesheet" href="tokens.css">
<link rel="stylesheet" href="style.css">
</head>
<body>
<!-- macrostructure: 19 Map / Diagram · nav N3 side rail · footer Ft2 · vocabulary: hydrographic long-section drawing -->
<a class="skip" href="#main">Skip to the drawing</a>
<div class="frame">
<nav class="rail" aria-label="Firstline">
  <a class="wm" href="#main">Firstline</a>
  <ol class="rail-l">
    <li><a href="#s1"><span class="num">1</span> Diagnose</a></li>
    <li><a href="#s2"><span class="num">2</span> Prescribe</a></li>
    <li><a href="#s3"><span class="num">3</span> Follow up</a></li>
    <li><a href="#method">Method</a></li>
  </ol>
  <dl class="rail-f"><div><dt>Reach</dt><dd>${esc(L.site.name)}</dd></div><div><dt>As of</dt><dd class="num">${L.asOf}</dd></div></dl>
</nav>
<main id="main">
  <header class="top">
    <p class="scenario" role="note">${esc(L.label)}</p>
    <h1>Stream chart</h1>
    <p class="lede">Long section of the reach: what is wrong, what to do first, and whether it worked.</p>
    ${profile()}
  </header>

  <section class="blk" id="s1" aria-labelledby="h1a">
    <h2 id="h1a"><span class="num">1</span> Diagnose</h2>
    <p class="intro"><span class="num">${st.length}</span> D2.4 stressors: <span class="num">${L.statusCount('CONFIRMED')}</span> confirmed, <span class="num">${L.statusCount('SUSPECTED')}</span> suspected, <span class="num">${L.statusCount('NOT_ASSESSED')}</span> not assessed. ${L.cite(30, 'Water pollution. Usually related with excessive concentrations of organic matter, nutrients suspended solids, but also heavy metals, plastics, pharmaceuticals, among other pollutants.', 'S01, the stressor catalogue')}</p>
    <div class="tw"><table class="log stressors-log"><caption class="sr">Stressor log</caption><thead><tr><th scope="col">No.</th><th scope="col">Stressor</th><th scope="col">State</th><th scope="col">Evidence or what would settle it</th></tr></thead><tbody>${log}</tbody></table></div>
  </section>

  <section class="blk" id="s2" aria-labelledby="h2a">
    <h2 id="h2a"><span class="num">2</span> Prescribe</h2>
    <p class="intro">${esc(L.firstline.name)} · ${L.vmark(L.firstline.verdict)}. The column reads top down: a higher stratum is admitted only when the first line is covered.</p>
    <ol class="column">${strata}</ol>
    <form class="place" data-place aria-label="Place a measure on the ladder">
      <div><label for="pm">Place a measure on the column (keyboard path)</label><select id="pm" name="measure">${L.placeOptions()}</select></div>
      <button class="btn" type="submit">Place</button>
      <output for="pm" aria-live="polite">Pick any of the ${L.F.measures.length} catalogue measures. The stratum and the engine verdict appear here.</output>
    </form>
    <p class="xcheck">Cross-check: the ${esc(L.emscher.name.split(',')[0])} casebook (D2.4 p.${L.emscher.page}), replayed through the same engine, is ${L.emscher.verdict.toLowerCase()}: <span class="num">${L.emscher.total}</span> measures, <span class="num">${L.emscher.tally.INDICATED}</span> indicated, <span class="num">${L.emscher.tally.DEFERRED}</span> deferred.</p>
  </section>

  <section class="blk" id="s3" aria-labelledby="h3a">
    <h2 id="h3a"><span class="num">3</span> Follow up</h2>
    <p class="intro">Before and after, control and impact. A verdict is written only when the lag has passed and the design can bear it.</p>
    <div class="cards">
      ${card(oO, `<span class="num">${oO.measureId}</span> ${esc(oO.indicatorName.split(' (')[0])}`, `<p class="note">Contrast <span class="num">${n1(oO.contrast)}</span>, ${Math.round(oO.ci.level * 100)}% interval <span class="num">${n1(oO.ci.low)}</span> to <span class="num">${n1(oO.ci.high)}</span>, delta <span class="num">${oO.delta}</span>.</p><figure>${L.baciPlot(oO, { id: 'p1' })}</figure><figure>${L.baciContrast(oO, { id: 'c1' })}</figure>`)}
      ${card(oN, `<span class="num">${oN.measureId}</span> ${esc(oN.indicatorName.split(' (')[0])}, slow to respond`, `<p class="note">Cannot be judged before <strong class="num">${oN.knowableFrom}</strong>. It waits on the clock, not on visits.</p><figure>${L.lagBar(oN, { id: 'l1' })}<figcaption><span class="num">${L.lag.doneDays}</span> of <span class="num">${L.lag.totalDays}</span> days elapsed.</figcaption></figure>`, false)}
      ${card(oC, 'The same design when the control moves too', `<p class="note">Contrast <span class="num">${n1(oC.contrast)}</span>, interval <span class="num">${n1(oC.ci.low)}</span> to <span class="num">${n1(oC.ci.high)}</span> spans zero. The control reach moved from <span class="num">${n1(oC.cells.beforeControl.mean)}</span> to <span class="num">${n1(oC.cells.afterControl.mean)}</span>.</p><figure>${L.baciPlot(oC, { id: 'p3' })}</figure>`)}
    </div>
    <ul class="also">${alsoOn.map((o) => `<li>${L.vmark(o.verdict)} ${esc(o.indicatorName.split(' (')[0])}: contrast <span class="num">${n1(o.contrast)}</span>, interval <span class="num">${n1(o.ci.low)}</span> to <span class="num">${n1(o.ci.high)}</span></li>`).join('')}</ul>
    <h3 class="sched-h">Follow-up schedule</h3>
    <div class="tw"><table class="log"><caption class="sr">Follow-up schedule</caption><thead><tr><th scope="col">Measure</th><th scope="col">Indicator</th><th scope="col">Design</th><th scope="col">Knowable from</th><th scope="col">Check-ups needed</th></tr></thead><tbody>${sched}</tbody></table></div>
  </section>

  <footer class="foot" id="method">
    <p>Firstline is an independent prototype, not the OneAquaHealth Decision Support System and not endorsed by the consortium. It encodes CC-BY 4.0 content from the D2.4 Catalogue of measures (Dias, Serra, Feio, 2025). The engine owns every verdict; the proposer only reads notes.</p>
    <ul class="rules-l">${rules}</ul>
  </footer>
</main>
</div>
<script type="application/json" id="place-data">${JSON.stringify(L.placeVerdicts())}</script>
<script>${L.SCRIPT}</script>
</body>
</html>
`
}
