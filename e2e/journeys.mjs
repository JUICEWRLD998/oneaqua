// Fixture journeys in a real browser (P8). No model calls: the server runs with OPENROUTER_API_KEY unset.
// Usage: node e2e/journeys.mjs [--port 3140] [--only 1,2]
// Every journey runs TWICE: for real (must pass) and PLANTED (one assertion deliberately wrong; must fail).
// A journey that passes when planted is a decorative check, and the whole run is red.
import { writeFileSync, mkdirSync } from 'node:fs'
import { launch } from './cdp.mjs'
import {
  attr, click, contrastOf, exists, freshStorage, inViewport, mulberry32, press, recordErrors, setValue, sleep,
  staleCheck, startServer, stopServer, text, typeText, waitFor, waitUp,
} from './lib.mjs'

const args = process.argv.slice(2)
const arg = (n, d) => { const i = args.indexOf(n); return i > -1 ? args[i + 1] : d }
const PORT = Number(arg('--port', 3140))
const ONLY = arg('--only', '') ? arg('--only', '').split(',').map(Number) : null
const RANDOM_RUNS = Number(arg('--runs', 20))

class Fail extends Error {}
const ok = (cond, msg) => { if (!cond) throw new Fail(msg) }

// ── journeys ────────────────────────────────────────────────────────────────────────────
// `bad(real, wrong)` returns `wrong` when planted, so exactly one assertion per journey is sabotaged.

const J = []
const journey = (n, name, fn) => J.push({ n, name, fn })

journey(1, 'Cold judge: place 4.3.3, see the refusal stamp with D2.4 p.19, on screen, readable', async ({ page, base, bad, errors, log }) => {
  await freshStorage(page, base)
  ok(!(await exists(page, '[data-placed]')), 'cold start should have an empty ladder')
  await click(page, '[data-place="4.3.3"]')
  await waitFor(page, `document.querySelector('[data-stamp="CONTRAINDICATED"]')`, 4000, 'CONTRAINDICATED stamp')
  const t = await text(page, '[data-stamp="CONTRAINDICATED"]')
  ok(t.includes(bad('p.19', 'p.18')), `stamp text was "${t}"`)
  ok(await inViewport(page, '[data-stamp="CONTRAINDICATED"]'), 'stamp not fully on screen')
  const ratio = await contrastOf(page, '[data-stamp="CONTRAINDICATED"]')
  log(`stamp contrast ${ratio}:1`)
  ok(ratio >= 4.5, `stamp contrast ${ratio}:1 is below 4.5`)
  ok((await attr(page, '[data-placed="4.3.3"]', 'data-verdict')) === 'CONTRAINDICATED', 'placed item verdict')
  ok((await text(page, '[data-callout="4.3.3"]')).includes('D2.4 · p.19'), 'callout should carry the cite chip')
  ok(errors().length === 0, 'uncaught errors: ' + errors().join(' | '))
})

journey(2, `Unscripted: ${RANDOM_RUNS} seeded random runs, every placement answered, zero dead ends, zero errors`, async ({ page, base, bad, errors, log }) => {
  const nItems = await (async () => { await freshStorage(page, base, 'new'); return page.eval(`document.querySelectorAll('select[data-item]').length`) })()
  ok(nItems === 14, `expected 14 evidence items, found ${nItems}`)
  let placements = 0
  for (let run = 0; run < RANDOM_RUNS; run++) {
    const rnd = mulberry32(1000 + run)
    await freshStorage(page, base, 'new')
    // tick 3 random evidence items (random observer, random non-empty answer)
    for (let i = 0; i < 3; i++) {
      const obs = rnd() < 0.5 ? 'A' : 'B'
      await click(page, `[data-observer="${obs}"]`)
      const items = await page.eval(`[...document.querySelectorAll('select[data-item]')].map(s=>({id:s.getAttribute('data-item'),opts:[...s.options].map(o=>o.value).filter(Boolean)}))`)
      const it = items[Math.floor(rnd() * items.length)]
      await setValue(page, `select[data-item="${it.id}"]`, it.opts[Math.floor(rnd() * it.opts.length)])
    }
    // place 5 random measures
    const ids = await page.eval(`[...document.querySelectorAll('[data-place]')].map(b=>b.getAttribute('data-place'))`)
    ok(ids.length >= 5, 'palette should list measures (filter empty, L1/L2 open)')
    const pool = await page.eval(`(()=>{document.querySelectorAll('details').forEach(d=>d.open=true);return [...document.querySelectorAll('[data-place]')].map(b=>b.getAttribute('data-place'))})()`)
    ok(pool.length === 43, `expected 43 placeable measures, found ${pool.length}`)
    const picks = []
    while (picks.length < 5) { const id = pool[Math.floor(rnd() * pool.length)]; if (!picks.includes(id)) picks.push(id) }
    for (const id of picks) {
      await click(page, `[data-place="${id}"]`)
      await waitFor(page, `document.querySelector('[data-placed="${id}"]')`, 3000, `placed ${id}`)
      const verdict = await attr(page, `[data-placed="${id}"]`, 'data-verdict')
      const reason = await page.eval(`(document.querySelector('[data-placed="${id}"]').innerText||'')`)
      ok(!!verdict && verdict.length > 2, `${id} has no verdict`)
      ok(reason.includes('D2.4') || reason.length > 40, `${id} shows no reason`)
      placements++
    }
    // no dead end: a plan verdict is shown, the catalogue still has enabled buttons, and the page stays interactive
    const pv = await attr(page, '[data-plan-verdict]', 'data-plan-verdict')
    ok(['SIGNABLE', 'INCOMPLETE', 'BLOCKED'].includes(pv), `plan verdict "${pv}"`)
    ok(await page.eval(`[...document.querySelectorAll('[data-place]')].some(b=>!b.disabled)`), 'dead end: no placeable measure left')
    ok(errors().length === 0, `run ${run} errors: ` + errors().join(' | '))
  }
  log(`${RANDOM_RUNS} runs, ${placements} placements`)
  ok(placements === bad(RANDOM_RUNS * 5, RANDOM_RUNS * 5 + 1), `placements ${placements}`)
})

journey(3, 'Override: blocked plan cannot be signed, short reason rejected, valid reason -> SIGNABLE -> signed -> DetectedIssue.mitigation', async ({ page, base, bad, errors }) => {
  await freshStorage(page, base)
  await click(page, '[data-preset="naive"]')
  await waitFor(page, `document.querySelector('[data-placed="4.3.3"][data-verdict="CONTRAINDICATED"]')`, 4000, 'naive plan refusal')
  await click(page, '[data-go-sign]')
  await waitFor(page, `document.querySelector('[data-page="export"]')`, 6000, 'export page')
  ok((await attr(page, '[data-page="export"]', 'data-plan-verdict')) === 'BLOCKED', 'naive plan should be BLOCKED')
  ok(await page.eval(`document.querySelector('[data-sign]').disabled`), 'sign must be disabled while blocked')
  await setValue(page, '#approver', 'A. Approver')
  await setValue(page, '#r-4\\.3\\.3', 'too short')
  await click(page, '[data-record-override]')
  ok(await exists(page, '[data-override-error]'), 'a 9-character reason must be rejected')
  ok((await attr(page, '[data-page="export"]', 'data-plan-verdict')) === 'BLOCKED', 'still blocked after a rejected reason')
  await setValue(page, '#r-4\\.3\\.3', 'Sewer works are funded for 2028; the channel works cannot wait a further season.')
  await click(page, '[data-record-override]')
  await waitFor(page, `document.querySelector('[data-page="export"]').getAttribute('data-plan-verdict')==='SIGNABLE'`, 4000, 'SIGNABLE after override')
  ok(await page.eval(`!document.querySelector('[data-sign]').disabled`), 'sign enabled once signable')
  await click(page, '[data-sign]')
  await waitFor(page, `document.querySelector('[data-page="export"]').getAttribute('data-signed')==='yes'`, 4000, 'signed')
  const m = Number(await attr(page, '[data-page="export"]', 'data-mitigations'))
  ok(m >= bad(1, 99), `DetectedIssue.mitigation count ${m}`)
  ok((await text(page, '[data-ledger]')).includes('Sewer works'), 'override ledger should show the reason')
  ok(errors().length === 0, 'uncaught errors: ' + errors().join(' | '))
})

journey(4, 'Proposer offline: panel says so, cached demo note is badged cached, the chart still works', async ({ page, base, bad, errors }) => {
  await freshStorage(page, base, 'new')
  await setValue(page, '#note', 'The water by the footbridge smelled of sewage this morning and looked grey.')
  await click(page, '[data-propose]')
  await waitFor(page, `document.querySelector('[data-proposer-state]')`, 6000, 'proposer result')
  ok((await attr(page, '[data-proposer-state]', 'data-proposer-state')) === bad('offline', 'live'), 'state should be offline with no key')
  ok((await text(page, '[data-proposer-state]')).includes('Proposer offline. The engine does not need it.'), 'offline message')
  await click(page, '[data-demo-note]')
  await click(page, '[data-propose]')
  await waitFor(page, `document.querySelector('[data-proposer-state="cached"]')`, 6000, 'cached result')
  ok((await text(page, '[data-badge="cached"]')).includes('Cached result · no new model call'), 'cached badge text')
  ok(await exists(page, '[data-proposal]'), 'cached demo note should list proposals')
  await click(page, '[data-place="4.2.2"]')
  await waitFor(page, `document.querySelector('[data-placed="4.2.2"]')`, 3000, 'chart works while proposer is offline')
  ok(errors().length === 0, 'uncaught errors: ' + errors().join(' | '))
})

journey(5, 'Casebook: the Emscher sequence replays with zero refusals', async ({ page, base, bad, errors, log }) => {
  await freshStorage(page, base, 'casebook')
  await waitFor(page, `document.querySelector('[data-case="5.1.2"][aria-pressed="true"]')`, 5000, 'Emscher selected')
  await click(page, '[data-all]')
  await waitFor(page, `document.querySelector('[data-tally]').getAttribute('data-shown')!=='1'`, 3000, 'all steps shown')
  const shown = Number(await attr(page, '[data-tally]', 'data-shown'))
  const refusals = await attr(page, '[data-tally]', 'data-refusals')
  log(`${shown} measures, ${refusals} refusals`)
  ok(shown > 5, 'Emscher should place several measures')
  ok(refusals === bad('0', '1'), `refusals ${refusals}`)
  ok(await page.eval(`document.querySelector('[data-step-id]').getAttribute('data-step-id')==='4.2.2'`), 'the sewer comes first')
  ok(errors().length === 0, 'uncaught errors: ' + errors().join(' | '))
})

journey(6, 'Keyboard only: journey 1 with no pointer', async ({ page, base, bad, errors, log }) => {
  await freshStorage(page, base)
  await page.eval(`document.getElementById('mfilter').focus()`)
  await typeText(page, '4.3.3')
  await waitFor(page, `document.querySelector('[data-place="4.3.3"]')`, 3000, 'filtered to 4.3.3')
  let tabs = 0
  const target = bad('4.3.3', '9.9.9')
  while (tabs < 12 && (await page.eval(`document.activeElement&&document.activeElement.getAttribute('data-place')`)) !== target) { await press(page, 'Tab'); tabs++ }
  log(`reached the Place button in ${tabs} Tab presses`)
  ok((await page.eval(`document.activeElement&&document.activeElement.getAttribute('data-place')`)) === target, `focus never reached ${target}`)
  await press(page, 'Enter')
  await waitFor(page, `document.querySelector('[data-stamp="CONTRAINDICATED"]')`, 4000, 'stamp via keyboard')
  ok((await text(page, '[data-stamp="CONTRAINDICATED"]')).includes('p.19'), 'stamp cites p.19')
  ok(errors().length === 0, 'uncaught errors: ' + errors().join(' | '))
})

// ── runner ──────────────────────────────────────────────────────────────────────────────
const server = startServer(PORT, { OPENROUTER_API_KEY: '', OPENROUTER_MODEL: '', PROPOSER_MODE: '' })
const report = [`E2E fixture journeys · ${new Date().toISOString()} · node ${process.version}`, `server: next start -p ${PORT}, OPENROUTER_API_KEY unset`, '']
let red = false
const out = (s) => { report.push(s); console.log(s) }
let page
try {
  if (!(await waitUp(server.url))) throw new Error('server did not come up')
  const st = await staleCheck(server.url)
  out(`stale-server check: ${st.checked} served assets, ${st.missing.length} missing on disk ${st.missing.length ? 'FAIL ' + st.missing.join(',') : 'ok'}`)
  if (st.missing.length || st.checked === 0) throw new Error('stale server (or nothing to check)')
  page = await launch(9700 + Math.floor(Math.random() * 50))
  await page.cmd('Log.enable')
  const errors = recordErrors(page)
  for (const j of J) {
    if (ONLY && !ONLY.includes(j.n)) continue
    for (const planted of [false, true]) {
      const t0 = Date.now()
      const bad = (real, wrong) => (planted ? wrong : real)
      const lines = []
      let result = 'PASS', detail = ''
      try { await j.fn({ page, base: server.url, bad, errors, log: (s) => lines.push(s) }) } catch (e) { result = 'FAIL'; detail = e.message }
      const secs = ((Date.now() - t0) / 1000).toFixed(1)
      const good = planted ? result === 'FAIL' : result === 'PASS'
      if (!good) red = true
      out(`${good ? 'ok  ' : 'RED '} J${j.n} ${planted ? '[planted failure -> must fail]' : '[real]'} ${result} ${secs}s  ${j.name}${detail ? '\n       ' + detail : ''}${lines.length ? '\n       ' + lines.join('; ') : ''}`)
    }
  }
} catch (e) {
  red = true
  out('HARNESS ERROR: ' + e.message)
} finally {
  page?.close()
  stopServer(server)
}
out('')
out(red ? 'RESULT: RED' : 'RESULT: GREEN (every real journey passed and every planted failure failed)')
mkdirSync('evidence', { recursive: true })
writeFileSync('evidence/e2e-journeys.txt', report.join('\n') + '\n')
process.exit(red ? 1 : 0)
