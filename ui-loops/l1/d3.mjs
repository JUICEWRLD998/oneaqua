// D3 Formulary: a pharmacopoeia monograph. Running heads, dense two-column reference setting, boxed contraindications,
// Indications / Contraindications / Monitoring per measure. Macrostructure 02 Long Document · N9 contents list · Ft4.
import * as L from './lib.mjs'
const { esc, n1 } = L

export function renderD3() {
  const st = L.stressors
  const first = L.firstline.measures
  const rf = L.refusal
  const oO = L.oOdour, oN = L.oNyk, oC = L.oConf
  const alsoOn = L.outcomes.filter((o) => o.verdict === 'IMPROVED' && o !== oO)
  const conf = st.filter((s) => s.status === 'CONFIRMED')

  const stressorEntries = st.map((s) => `<li class="ent st-${s.status.toLowerCase()}"><span class="num sid">${s.id}</span> <strong>${esc(s.name)}</strong>${s.firstLine ? ' <span class="fl">first line</span>' : ''} <span class="lead"></span> ${L.vmark(s.status)}
    <span class="sub">${s.status === 'CONFIRMED' ? `<span class="num">${s.evidenceCount}</span> check-ups on file.` : s.settle.length ? `To settle, ask <q>${esc(s.settle[0].text)}</q>` : 'No field-form item maps to this stressor yet.'}</span></li>`).join('')

  const monograph = (m) => `<article class="mono" data-measure="${m.id}">
    <h4><span class="num">${m.id}</span> ${esc(m.name)} <span class="vr">${L.vmark(m.verdict)}</span></h4>
    <dl><dt>Indications</dt><dd>${m.addresses.map((a) => `<span class="num">${a}</span>`).join(', ') || 'none recorded'}. ${esc(m.objective ?? '')}</dd>
    <dt>Monitoring</dt><dd>${(m.citizenMonitorable ?? []).map((i) => esc(L.indById[i]?.name.split(' (')[0] ?? i)).join(', ') || 'none a citizen can score'}; response ${esc(m.responseLag ?? '')}.</dd></dl></article>`

  const byLine = L.LINES.map((ln) => {
    const here = first.filter((m) => m.line === ln.id)
    return `<li class="mline" data-line="${ln.id}"><h3>${esc(ln.name)}, ${esc(ln.tag)} <span class="num cnt">${ln.count}</span></h3><div data-rung-list="${ln.id}" class="mlist">${here.map(monograph).join('') || '<p class="none">Nothing placed on this line.</p>'}</div></li>`
  }).join('')

  const contra = `<aside class="box" aria-labelledby="cx">
    <p class="box-k">Contraindicated</p>
    <h3 id="cx"><span class="num">${rf.measure.id}</span> ${esc(rf.measure.name)} ${L.vmark('CONTRAINDICATED', { text: false })}</h3>
    <p>${esc(rf.reason.plain)} Plan as brought, <em>${esc(rf.planName)}</em>, is ${L.vmark(rf.planVerdict)}.</p>
    <blockquote><q>${esc(rf.rule.quote)}</q> ${L.citeRule(rf.reason)}</blockquote>
    <p><strong>Use instead:</strong> ${rf.instead.map((m) => `<span class="num">${m.id}</span> ${esc(L.short(m.id))}${L.insteadInPlan(m.id) ? ' (in the signed plan)' : ''}`).join('; ')}.</p></aside>`

  const fig = (o, id, kind) => `<figure>${kind === 'plot' ? L.baciPlot(o, { id }) : kind === 'ci' ? L.baciContrast(o, { id }) : L.lagBar(o, { id })}</figure>`
  const cells = (o, means = true) => `<table class="cells"><thead><tr><td></td><th scope="col">Before</th><th scope="col">After</th></tr></thead><tbody>${[['Control', 'beforeControl', 'afterControl'], ['Impact', 'beforeImpact', 'afterImpact']].map(([n, a, b]) => `<tr><th scope="row">${n}</th>${[a, b].map((k) => `<td><span class="num">${means ? n1(o.cells[k].mean) : '&ndash;'}</span> <span class="nn">n <span class="num">${o.cells[k].n}</span></span></td>`).join('')}</tr>`).join('')}</tbody></table>`

  const sched = L.followup.map((it) => `<tr><th scope="row" class="num">${it.measureId}</th><td>${esc(it.indicatorName.split(' (')[0])}</td><td class="num">${it.design}</td><td class="num">${it.knowableFrom ?? 'not built yet'}</td><td class="num">${it.knowableFrom === null ? it.visitsNeeded.afterImpact : 0}</td></tr>`).join('')
  const rules = L.F.rules.map((r) => `<li><span class="num">${r.id}</span> ${esc(r.name)} ${L.citeRule(r)}</li>`).join('')

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
<!-- macrostructure: 02 Long Document · nav N9 contents list · footer Ft4 · vocabulary: pharmacopoeia monograph -->
<a class="skip" href="#doc">Skip to the text</a>
<div class="runhead"><span>Firstline</span><span>Stream chart · ${esc(L.site.name)}</span><span class="num">${L.asOf}</span></div>
<div class="page">
<nav class="toc" aria-label="Contents">
  <p class="toc-h">Contents</p>
  <ol><li><a href="#d">I · Diagnosis</a></li><li><a href="#p">II · Prescription</a></li><li><a href="#f">III · Follow-up</a></li><li><a href="#m">Method and sources</a></li></ol>
</nav>
<main id="doc">
  <header class="title">
    <h1>Stream chart</h1>
    <p class="deck">A monograph for one reach: what is wrong, what to give first, and how to tell it worked.</p>
    <p class="scenario" role="note">${esc(L.label)}</p>
    <p class="summary"><strong>Summary.</strong> ${conf.map((s) => esc(s.name.toLowerCase())).join(' and ')} are confirmed on <span class="num">${L.impact.id}</span>. The plan <em>${esc(L.firstline.name)}</em> is ${L.vmark(L.firstline.verdict)}; the plan brought in, <em>${esc(rf.planName)}</em>, is ${L.vmark(rf.planVerdict)}.</p>
  </header>

  <section id="d" aria-labelledby="dh"><h2 id="dh"><span class="rn">I</span> Diagnosis</h2>
    <p class="intro"><span class="num">${st.length}</span> stressors from D2.4: <span class="num">${L.statusCount('CONFIRMED')}</span> confirmed, <span class="num">${L.statusCount('SUSPECTED')}</span> suspected, <span class="num">${L.statusCount('NOT_ASSESSED')}</span> not assessed. ${L.cite(30, 'Water pollution. Usually related with excessive concentrations of organic matter, nutrients suspended solids, but also heavy metals, plastics, pharmaceuticals, among other pollutants.', 'S01, the stressor catalogue')}</p>
    <ul class="cols ents">${stressorEntries}</ul></section>

  <section id="p" aria-labelledby="ph"><h2 id="ph"><span class="rn">II</span> Prescription</h2>
    <p class="intro">${esc(L.firstline.name)}. Measures are set in D2.4 order; nothing on a later line is admitted while a first-line stressor is open.</p>
    ${contra}
    <ol class="mlines">${byLine}</ol>
    <form class="place" data-place aria-label="Place a measure on the ladder">
      <div><label for="pm">Place a measure (keyboard path)</label><select id="pm" name="measure">${L.placeOptions()}</select></div>
      <button class="btn" type="submit">Place</button>
      <output for="pm" aria-live="polite">Pick any of the ${L.F.measures.length} catalogue measures. The line and the engine verdict appear here.</output>
    </form>
    <p class="xcheck">Cross-check: the ${esc(L.emscher.name.split(',')[0])} casebook (D2.4 p.${L.emscher.page}), replayed through the same engine, is ${L.emscher.verdict.toLowerCase()}: <span class="num">${L.emscher.total}</span> measures, <span class="num">${L.emscher.tally.INDICATED}</span> indicated, <span class="num">${L.emscher.tally.DEFERRED}</span> deferred.</p></section>

  <section id="f" aria-labelledby="fh"><h2 id="fh"><span class="rn">III</span> Follow-up</h2>
    <p class="intro">Monitoring is before and after, control and impact. A verdict is written only when the lag has passed and the design can bear it.</p>
    <article class="mon"><h3><span class="num">${oO.measureId}</span> ${esc(oO.indicatorName.split(' (')[0])} ${L.vmark(oO.verdict)} ${L.citeRule(oO.reasons[0])}</h3>
      <p>Contrast <span class="num">${n1(oO.contrast)}</span>, ${Math.round(oO.ci.level * 100)}% interval <span class="num">${n1(oO.ci.low)}</span> to <span class="num">${n1(oO.ci.high)}</span>, delta <span class="num">${oO.delta}</span>.</p>
      <div class="trip">${cells(oO)}${fig(oO, 'p1', 'plot')}${fig(oO, 'c1', 'ci')}</div></article>
    <article class="mon"><h3><span class="num">${oN.measureId}</span> ${esc(oN.indicatorName.split(' (')[0])} ${L.vmark(oN.verdict)} ${L.citeRule(oN.reasons[0])}</h3>
      <p>Cannot be judged before <strong class="num">${oN.knowableFrom}</strong>; <span class="num">${L.lag.doneDays}</span> of <span class="num">${L.lag.totalDays}</span> days have elapsed. It waits on the clock, not on visits.</p>
      <div class="trip">${cells(oN, false)}${fig(oN, 'l1', 'lag')}</div></article>
    <article class="mon"><h3>Control moved as well ${L.vmark(oC.verdict)} ${L.citeRule(oC.reasons[0])}</h3>
      <p>Contrast <span class="num">${n1(oC.contrast)}</span>, interval <span class="num">${n1(oC.ci.low)}</span> to <span class="num">${n1(oC.ci.high)}</span> spans zero; the control reach moved from <span class="num">${n1(oC.cells.beforeControl.mean)}</span> to <span class="num">${n1(oC.cells.afterControl.mean)}</span>.</p>
      <div class="trip">${cells(oC)}${fig(oC, 'p3', 'plot')}${fig(oC, 'c3', 'ci')}</div></article>
    <ul class="also">${alsoOn.map((o) => `<li>${L.vmark(o.verdict)} ${esc(o.indicatorName.split(' (')[0])}: contrast <span class="num">${n1(o.contrast)}</span>, interval <span class="num">${n1(o.ci.low)}</span> to <span class="num">${n1(o.ci.high)}</span></li>`).join('')}</ul>
    <h3 class="sh">Follow-up schedule</h3>
    <div class="tw"><table class="sched"><caption class="sr">Follow-up schedule</caption><thead><tr><th scope="col">Measure</th><th scope="col">Indicator</th><th scope="col">Design</th><th scope="col">Knowable from</th><th scope="col">Check-ups needed</th></tr></thead><tbody>${sched}</tbody></table></div></section>

  <footer id="m"><h2>Method and sources</h2>
    <p>Firstline is an independent prototype, not the OneAquaHealth Decision Support System and not endorsed by the consortium. It encodes CC-BY 4.0 content from the D2.4 Catalogue of measures (Dias, Serra, Feio, 2025). The engine owns every verdict; the proposer only reads notes.</p>
    <ul class="rules-l">${rules}</ul></footer>
</main>
</div>
<script type="application/json" id="place-data">${JSON.stringify(L.placeVerdicts())}</script>
<script>${L.SCRIPT}</script>
</body>
</html>
`
}
