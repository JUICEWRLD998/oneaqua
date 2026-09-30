// Width sweep: every route at 320 / 375 / 414 / 768 / 1280 (x800). Asserts no horizontal page scroll and no element that pokes
// past the viewport outside a scroll container, with a planted control (an element forced 2000px wide) that MUST be caught.
// Usage: node e2e/sweep.mjs [port]
import { writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { launch } from './cdp.mjs'
import { startServer, stopServer, waitUp, freshStorage, click, sleep } from './lib.mjs'

const port = Number(process.argv[2] ?? 3180)
const WIDTHS = [320, 375, 414, 768, 1280]
const hash = spawnSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', '-e', "import {encodeState,initialState} from './state/model'; console.log(encodeState(initialState('firstline')))"], { encoding: 'utf8' }).stdout.trim()
const ROUTES = [['home-empty', ''], ['home-built', `#${hash}`], ['new', 'new'], ['casebook', 'casebook'], ['export', 'plan/export'], ['method', 'method']]

const PROBE = `(()=>{
  const vw=document.documentElement.clientWidth
  const scrolls=(e)=>{for(let n=e.parentElement;n;n=n.parentElement){const o=getComputedStyle(n).overflowX;if((o==='auto'||o==='scroll')&&n.scrollWidth>n.clientWidth+1)return true}return false}
  const off=[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.right>vw+1&&!scrolls(e)&&getComputedStyle(e).position!=='fixed'&&!e.closest('svg')&&!e.closest('[hidden]')}).slice(0,4).map(e=>e.tagName.toLowerCase()+(e.className&&typeof e.className==='string'?'.'+e.className.split(' ')[0]:''))
  return {vw, doc:document.documentElement.scrollWidth, off}
})()`

const server = startServer(port, { OPENROUTER_API_KEY: '', PROPOSER_MODE: 'cached' })
const lines = [`Width sweep · ${new Date().toISOString()}`, '']
let bad = 0
let page
try {
  if (!(await waitUp(server.url))) throw new Error('server did not come up')
  page = await launch(9950 + Math.floor(Math.random() * 40))
  // planted control: the probe must see a 2000px element
  await page.open(`${server.url}/method`, { w: 375, h: 800, scheme: 'dark' })
  await page.eval(`(()=>{const d=document.createElement('div');d.id='__ctl';d.style.cssText='width:2000px;height:10px;background:#888';document.querySelector('main').appendChild(d)})()`)
  const ctl = await page.eval(PROBE)
  const seen = ctl.doc > ctl.vw || ctl.off.length > 0
  lines.push(`planted control (2000px element at 375): ${seen ? 'caught' : 'NOT CAUGHT, probe is blind'}`)
  if (!seen) bad++
  for (const [label, path] of ROUTES) {
    const row = []
    for (const w of WIDTHS) {
      await freshStorage(page, server.url, path.startsWith('#') ? '' : path)
      await page.cmd('Emulation.setDeviceMetricsOverride', { width: w, height: 800, deviceScaleFactor: 1, mobile: false })
      if (path.startsWith('#')) { await page.eval(`location.hash=${JSON.stringify(path)}`); await page.eval('location.reload()'); await sleep(1200) } else await sleep(300)
      const r = await page.eval(PROBE)
      const ok = r.doc <= r.vw && r.off.length === 0
      if (!ok) bad++
      row.push(`${w}:${ok ? 'ok' : 'OVERFLOW ' + r.doc + '>' + r.vw + ' ' + r.off.join(',')}`)
    }
    lines.push(`${label.padEnd(11)} ${row.join('  ')}`)
    console.log(lines.at(-1))
  }
} catch (e) {
  bad++
  lines.push('HARNESS ERROR: ' + e.message)
} finally {
  page?.close()
  stopServer(server)
}
lines.push('', bad ? `RESULT: RED (${bad})` : 'RESULT: GREEN, no horizontal overflow on any route at any width')
writeFileSync('evidence/width-sweep.txt', lines.join('\n') + '\n')
console.log(lines.at(-1))
process.exit(bad ? 1 : 0)
