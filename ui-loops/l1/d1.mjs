// D1 Survey Sheet: the OneAquaHealth standardised field form. Diagnose, prescribe, follow up as three numbered form sections.
import * as L from './lib.mjs'
const { esc, n1, sign } = L

const tick = (on, k) => `<svg class="tick${on ? ` on v-${k}` : ''}" viewBox="0 0 16 16" width="18" height="18" aria-hidden="true" focusable="false"><rect x=".75" y=".75" width="14.5" height="14.5" rx="1.5"/>${on ? '<path d="M3.5 8.5 L6.8 11.5 L12.5 4.5"/>' : ''}</svg><span class="sr">${on ? 'yes' : 'no'}</span>`
const cellsTable = (o, { withMeans = true, cap }) => {
  const c = o.cells
  const cell = (x) => `<td><span class="entry">${withMeans ? `<span class="num">${n1(x.mean)}</span>` : '<span class="withheld">withheld</span>'}</span><span class="nn">n <span class="num">${x.n}</span></span></td>`
  return `<table class="cells"><caption>${cap}</caption><thead><tr><td></td><th scope="col">Before</th><th scope="col">After</th></tr></thead><tbody>
  <tr><th scope="row">Control reach</th>${cell(c.beforeControl)}${cell(c.afterControl)}</tr>
  <tr><th scope="row">Impact reach</th>${cell(c.beforeImpact)}${cell(c.afterImpact)}</tr></tbody></table>`
}

export function renderD1() {
  const st = L.stressors
  const first = L.firstline.measures
  const rf = L.refusal
  const oO = L.oOdour, oN = L.oNyk, oC = L.oConf
  const alsoOn = L.outcomes.filter((o) => o.verdict === 'IMPROVED' && o !== oO)

  const stressRows = st.map((s) => {
    const settle = s.status === 'CONFIRMED'
      ? `<span class="entry">Evidence: <span class="num">${s.evidenceCount}</span> check-ups</span>`
      : s.settle.length
        ? s.settle.map((i) => `<span class="ask">Ask: <q>${esc(i.text)}</q> <span class="ans">${i.answers.map(esc).join(' · ')}</span></span>`).join('')
        : '<span class="none">No field-form item maps to this stressor yet.</span>'
    return `<tr>
      <th scope="row" class="sid num">${s.id}</th>
      <td class="sname">${esc(s.name)}${s.firstLine ? ' <span class="fl">first line</span>' : ''}</td>
      <td class="tk">${tick(s.status === 'CONFIRMED', 'confirmed')}</td>
      <td class="tk">${tick(s.status === 'SUSPECTED', 'suspected')}</td>
      <td class="tk">${tick(s.status === 'NOT_ASSESSED', 'notassessed')}</td>
      <td class="settle">${settle}</td></tr>`
  }).join('\n')

  const rungs = L.LINES.map((ln) => {
    const here = first.filter((m) => m.line === ln.id)
    const placed = here.map((m) => `<li>${tick(true, 'improved')}<span class="mid num">${m.id}</span><span class="mn">${esc(L.short(m.id))}</span><span class="pv">${L.vmark(m.verdict)}</span></li>`).join('')
    const slip = ln.id === 'L2' ? slipHtml() : ''
    return `<li class="rung" data-line="${ln.id}">
      <div class="rung-row">
        <div class="rung-h"><span class="rung-no num">${ln.id.startsWith('C') ? 'C' : ln.id.slice(1)}</span><span class="rung-t"><strong>${esc(ln.name)}</strong> <span class="tag">${esc(ln.tag)}</span></span></div>
        <div class="rung-c"><span class="entry num">${ln.count}</span> in catalogue</div>
        <ul class="placed" data-rung-list="${ln.id}">${placed || '<li class="none">Nothing placed on this rung.</li>'}</ul>
      </div>${slip}</li>`
  }).join('\n')

  function slipHtml() {
    return `<aside class="slip" aria-labelledby="slip-h">
      <div class="slip-stamp" role="img" aria-label="Contraindicated by rule R1, D2.4 page 19"><span class="stamp-w">Contraindicated</span><span class="stamp-r">R1 · Fix the leaks first</span></div>
      <div class="slip-body">
        <h3 id="slip-h">Refused: <span class="num">${rf.measure.id}</span> ${esc(rf.measure.name)}</h3>
        <p class="slip-plan">Plan as brought: <strong>${esc(rf.planName)}</strong> · ${L.vmark(rf.planVerdict)}</p>
        <p>${esc(rf.reason.plain)}</p>
        <blockquote class="bucket"><q>${esc(rf.rule.quote)}</q> ${L.citeRule(rf.reason)}</blockquote>
        <p class="instead-h">The catalogue points to, instead:</p>
        <ul class="instead">${rf.instead.map((m) => `<li>${tick(L.insteadInPlan(m.id), 'improved')}<span class="mid num">${m.id}</span><span class="mn">${esc(L.short(m.id))}</span>${L.insteadInPlan(m.id) ? '<span class="inplan">in the signed plan</span>' : ''}</li>`).join('')}</ul>
      </div></aside>`
  }

  const sched = L.followup.map((it) => {
    const v = it.visitsNeeded
    const need = it.knowableFrom === null ? `<span class="num">${v.afterImpact}</span> after, impact and control` : '<span class="num">0</span>'
    return `<tr><th scope="row" class="num">${it.measureId}</th><td>${esc(it.indicatorName.split(' (')[0])}</td><td class="num">${it.design}</td><td class="num">${it.knowableFrom ?? 'not built yet'}</td><td>${need}</td></tr>`
  }).join('')

  const rules = L.F.rules.map((r) => `<div class="rl"><dt><span class="num">${r.id}</span> ${esc(r.name)}</dt><dd>${L.citeRule(r)}</dd></div>`).join('')

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>Stream chart, Vale reach (scenario) · Firstline</title>
<link rel="stylesheet" href="tokens.css">
<link rel="stylesheet" href="style.css">
</head>
<body>
<!-- macrostructure: 14 Narrative Workflow · nav N1a (two real destinations: the chart and the method) · footer Ft4 · vocabulary: OneAquaHealth field survey form -->
<!-- pre-emit critique: P4 H4 E4 S5 R4 V4 (builder's own; the blind critic scores the final) -->
<a class="skip" href="#sheet">Skip to the sheet</a>
<header class="mast">
  <a class="wm" href="#sheet">Firstline</a>
  <nav aria-label="Firstline"><a href="#sheet" aria-current="page">Stream chart</a><a href="#rules">Method</a></nav>
</header>
<main id="sheet" class="sheet">
  <div class="body">
    <section class="head" aria-labelledby="t">
      <h1 id="t">Stream chart</h1>
      <p class="lede">One sheet per reach: what is wrong, what to do first, and whether it worked.</p>
      <dl class="fields">
        <div class="f f-wide"><dt>Site</dt><dd class="entry">${esc(L.site.name)}</dd></div>
        <div class="f"><dt>Impact reach</dt><dd class="entry num">${L.impact.id}</dd><dd class="sub num">${L.impact.lat}, ${L.impact.lon}</dd></div>
        <div class="f"><dt>Control reach</dt><dd class="entry num">${L.control.id}</dd><dd class="sub num">${L.control.lat}, ${L.control.lon}</dd></div>
        <div class="f"><dt>Check-ups on file</dt><dd class="entry num">${L.counts.impact} impact · ${L.counts.control} control</dd></div>
        <div class="f"><dt>Between the two reach points</dt><dd class="entry num">${L.reachDistanceM} m</dd></div>
        <div class="f"><dt>As of</dt><dd class="entry num">${L.asOf}</dd></div>
      </dl>
      <p class="scenario" role="note">${esc(L.label)}</p>
    </section>

    <section class="sec" aria-labelledby="s1">
      <h2 id="s1"><span class="secno num">1</span>Diagnose</h2>
      <p class="intro"><span class="num">${st.length}</span> stressors from D2.4 ${L.cite(30, 'Water pollution. Usually related with excessive concentrations of organic matter, nutrients suspended solids, but also heavy metals, plastics, pharmaceuticals, among other pollutants.', 'S01, the stressor catalogue')} Tick one box per row. <span class="num">${L.statusCount('CONFIRMED')}</span> confirmed, <span class="num">${L.statusCount('SUSPECTED')}</span> suspected, <span class="num">${L.statusCount('NOT_ASSESSED')}</span> not assessed.</p>
      <table class="grid stress">
        <caption class="sr">The twelve D2.4 stressors and their diagnosis state</caption>
        <thead><tr><th scope="col">No.</th><th scope="col">Stressor</th><th scope="col" class="tk">Confirmed</th><th scope="col" class="tk">Suspected <span class="num">${L.statusCount('SUSPECTED')}</span></th><th scope="col" class="tk">Not assessed</th><th scope="col">What would settle it</th></tr></thead>
        <tbody>${stressRows}</tbody>
      </table>
    </section>

    <section class="sec" aria-labelledby="s2">
      <h2 id="s2"><span class="secno num">2</span>Prescribe</h2>
      <p class="intro">Plan as sequenced: <strong>${esc(L.firstline.name)}</strong> · ${L.vmark(L.firstline.verdict)}. Measures climb the D2.4 hierarchy; nothing on a higher rung is admitted while a first-line stressor is open.</p>
      <ol class="ladder">${rungs}</ol>
      <form class="place" data-place aria-label="Place a measure on the ladder">
        <div><label for="pm">Place a measure on the ladder (keyboard path)</label>
        <select id="pm" name="measure">${L.placeOptions()}</select></div>
        <button class="btn" type="submit">Place on ladder</button>
        <output for="pm" aria-live="polite">Pick any of the ${L.F.measures.length} catalogue measures. The rung and the engine verdict appear here.</output>
      </form>
      <p class="xcheck">Cross-check: the ${esc(L.emscher.name.split(',')[0])} casebook (D2.4 p.${L.emscher.page}), replayed through the same engine, is <strong>${L.emscher.verdict.toLowerCase()}</strong>: <span class="num">${L.emscher.total}</span> measures, <span class="num">${L.emscher.tally.INDICATED}</span> indicated, <span class="num">${L.emscher.tally.DEFERRED}</span> deferred.</p>
    </section>

    <section class="sec" aria-labelledby="s3">
      <h2 id="s3"><span class="secno num">3</span>Follow up</h2>
      <p class="intro">Before and after, control and impact. A verdict is only written when the lag has passed and the design can bear it.</p>

      <article class="baci-form" aria-labelledby="b1">
        <h3 id="b1"><span class="num">${oO.measureId}</span> ${esc(oO.measure.name)}: ${esc(oO.indicatorName.split(' (')[0].toLowerCase())}</h3>
        <p class="verdict-line">${L.vmark(oO.verdict)}<span>Contrast <span class="num">${n1(oO.contrast)}</span>, <span class="num">${Math.round(oO.ci.level * 100)}</span>% interval <span class="num">${n1(oO.ci.low)}</span> to <span class="num">${n1(oO.ci.high)}</span>, above zero and at least delta <span class="num">${oO.delta}</span>.</span> ${L.citeRule(oO.reasons[0])}</p>
        <div class="baci-grid">
          ${cellsTable(oO, { cap: 'Cell means and check-ups (1 to 5 scale)' })}
          <figure class="fig">${L.baciPlot(oO, { id: 'p1' })}<figcaption>Means by cell. The dotted line is what the impact reach would have done had it followed the control.</figcaption></figure>
          <figure class="fig">${L.baciContrast(oO, { id: 'c1' })}<figcaption>The contrast and its interval against the delta band.</figcaption></figure>
        </div>
        <ul class="also">${alsoOn.map((o) => `<li>${L.vmark(o.verdict)} <span>${esc(o.indicatorName.split(' (')[0])}: contrast <span class="num">${n1(o.contrast)}</span>, interval <span class="num">${n1(o.ci.low)}</span> to <span class="num">${n1(o.ci.high)}</span></span></li>`).join('')}</ul>
      </article>

      <article class="baci-form" aria-labelledby="b2">
        <h3 id="b2"><span class="num">${oN.measureId}</span> ${esc(oN.measure.name.replace(/^Passive riparian vegetation: /, 'Passive riparian vegetation, '))}: ${esc(oN.indicatorName.split(' (')[0].toLowerCase())}</h3>
        <p class="verdict-line">${L.vmark(oN.verdict)}<span>Cannot be judged before <strong class="num">${oN.knowableFrom}</strong>. Check-ups still needed: <span class="num">${oN.visitsNeeded}</span>. This one waits on the clock, not on visits.</span> ${L.citeRule(oN.reasons[0])}</p>
        <div class="baci-grid">
          ${cellsTable(oN, { withMeans: false, cap: 'Check-ups by cell. Means are withheld until the verdict is allowed.' })}
          <figure class="fig fig-wide">${L.lagBar(oN, { id: 'l1' })}<figcaption>Response lag: <span class="num">${L.lag.doneDays}</span> of <span class="num">${L.lag.totalDays}</span> days elapsed since the works were finished.</figcaption></figure>
        </div>
      </article>

      <article class="baci-form" aria-labelledby="b3">
        <h3 id="b3">The same design when the control moves too</h3>
        <p class="verdict-line">${L.vmark(oC.verdict)}<span>Contrast <span class="num">${n1(oC.contrast)}</span>, interval <span class="num">${n1(oC.ci.low)}</span> to <span class="num">${n1(oC.ci.high)}</span> spans zero. The control reach moved from <span class="num">${n1(oC.cells.beforeControl.mean)}</span> to <span class="num">${n1(oC.cells.afterControl.mean)}</span>, so the change is not the measure's.</span> ${L.citeRule(oC.reasons[0])}</p>
        <div class="baci-grid">
          ${cellsTable(oC, { cap: 'Cell means and check-ups, control-moved variant' })}
          <figure class="fig">${L.baciPlot(oC, { id: 'p3' })}<figcaption>Both reaches rise together.</figcaption></figure>
          <figure class="fig">${L.baciContrast(oC, { id: 'c3' })}<figcaption>The interval straddles zero.</figcaption></figure>
        </div>
      </article>

      <h3 class="sched-h">Follow-up schedule</h3>
      <table class="grid sched">
        <caption class="sr">Follow-up schedule for the signed plan</caption>
        <thead><tr><th scope="col">Measure</th><th scope="col">Indicator</th><th scope="col">Design</th><th scope="col">Knowable from</th><th scope="col">Check-ups still needed</th></tr></thead>
        <tbody>${sched}</tbody>
      </table>
    </section>
  </div>
  <aside class="margin" aria-label="Sheet status">
    <h2 class="m-h">For the approver</h2>
    <dl class="m-list">
      <div><dt>Plan as brought</dt><dd>${esc(rf.planName)}<br>${L.vmark(rf.planVerdict)}</dd></div>
      <div><dt>Plan as sequenced</dt><dd>${esc(L.firstline.name)}<br>${L.vmark(L.firstline.verdict)}</dd></div>
      <div><dt>Open first-line stressors</dt><dd class="num">${rf.uncovered.join(', ')}</dd></div>
    </dl>
  </aside>
</main>
<footer class="colophon" id="rules">
  <h2 class="c-h">Method and colophon</h2>
  <p>Firstline is an independent prototype. It is not the OneAquaHealth Decision Support System and is not endorsed by the OneAquaHealth consortium. It encodes CC-BY 4.0 content from the D2.4 Catalogue of measures for urban aquatic ecosystems rehabilitation (Dias, Serra, Feio, 2025), the Key Indicators factsheets and the Field Sampling Protocols. Quotations are verbatim and carry the printed page.</p>
  <p>The engine owns every verdict and stressor state. The proposer only reads notes. Figures on this sheet are engine output for the scenario reach as of <span class="num">${L.asOf}</span>.</p>
  <dl class="rules">${rules}</dl>
</footer>
<script type="application/json" id="place-data">${JSON.stringify(L.placeVerdicts())}</script>
<script>${L.SCRIPT}</script>
</body>
</html>
`
}
