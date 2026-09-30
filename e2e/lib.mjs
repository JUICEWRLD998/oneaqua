// Shared e2e plumbing: start/stop a Next server, stale-asset check, DOM helpers, keyboard, contrast, seeded PRNG.
// Zero dependencies. Drives Chrome over CDP (see cdp.mjs). Everything is asserted against the app's own state words.
import { spawn, execSync } from 'node:child_process'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export function startServer(port, env = {}) {
  const proc = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(port)], {
    env: { ...process.env, ...env }, stdio: 'ignore',
  })
  return { port, proc, url: `http://localhost:${port}` }
}
export function stopServer(s) {
  try {
    if (process.platform === 'win32') execSync(`taskkill /PID ${s.proc.pid} /T /F`, { stdio: 'ignore' })
    else s.proc.kill('SIGKILL')
  } catch { /* gone */ }
}
export async function waitUp(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url); if (r.ok) return true } catch { /* not yet */ }
    await sleep(500)
  }
  return false
}

/** A server that is not serving the current build makes a working page look unstyled. Diff served asset paths against .next on disk. */
export async function staleCheck(base) {
  const html = await (await fetch(base + '/')).text()
  const assets = [...new Set([...html.matchAll(/\/_next\/static\/([^"'\s)]+\.(?:js|css))/g)].map((m) => m[1]))]
  const missing = assets.filter((a) => !existsSync(join('.next', 'static', a)))
  return { checked: assets.length, missing }
}

export function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function recordErrors(page) {
  return () =>
    page.events
      .filter((e) => e.method === 'Runtime.exceptionThrown' || (e.method === 'Log.entryAdded' && e.params.entry.level === 'error' && !/favicon/i.test(e.params.entry.text + (e.params.entry.url ?? ''))))
      .map((e) => JSON.stringify(e.params).slice(0, 300))
}

export const q = (sel) => JSON.stringify(sel)

export async function exists(page, sel) { return page.eval(`!!document.querySelector(${q(sel)})`) }
export async function text(page, sel) { return page.eval(`(document.querySelector(${q(sel)})||{}).textContent||''`) }
export async function attr(page, sel, a) { return page.eval(`(document.querySelector(${q(sel)})||{getAttribute(){return null}}).getAttribute(${q(a)})`) }
export async function click(page, sel) {
  const ok = await page.eval(`(()=>{const e=document.querySelector(${q(sel)});if(!e||e.disabled)return false;e.scrollIntoView({block:'center'});e.click();return true})()`)
  if (!ok) throw new Error(`cannot click ${sel} (missing or disabled)`)
  await sleep(120)
}
export async function waitFor(page, expr, ms = 6000, label = expr) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    if (await page.eval(`!!(${expr})`)) return true
    await sleep(100)
  }
  throw new Error(`timeout waiting for: ${label}`)
}
/** Set a React-controlled input/textarea/select value the way a user's typing would (native setter + bubbling event). */
export async function setValue(page, sel, value) {
  await page.eval(`(()=>{const e=document.querySelector(${q(sel)});if(!e)throw new Error('no '+${q(sel)});
    const proto=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${JSON.stringify(value)});
    e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}))})()`)
  await sleep(80)
}
export async function freshStorage(page, base, route = '') {
  await page.open(`${base}/${route}`, { w: 1280, h: 800, scheme: 'dark' })
  await page.eval('sessionStorage.clear()')
  await page.open(`${base}/${route}`, { w: 1280, h: 800, scheme: 'dark' })
  await waitFor(page, `document.querySelector('[data-ready="yes"]') || document.querySelector('main')`, 8000, 'page ready')
  await sleep(150)
}

// keyboard (no pointer events at all)
const KEYS = { Tab: { key: 'Tab', code: 'Tab', vk: 9 }, Enter: { key: 'Enter', code: 'Enter', vk: 13, text: '\r' } }
export async function press(page, name, { shift = false } = {}) {
  const k = KEYS[name]
  const base = { key: k.key, code: k.code, windowsVirtualKeyCode: k.vk, nativeVirtualKeyCode: k.vk, modifiers: shift ? 8 : 0 }
  await page.cmd('Input.dispatchKeyEvent', { type: 'keyDown', ...base, ...(k.text ? { text: k.text } : {}) })
  await page.cmd('Input.dispatchKeyEvent', { type: 'keyUp', ...base })
  await sleep(60)
}
export async function typeText(page, s) { await page.cmd('Input.insertText', { text: s }); await sleep(120) }

// WCAG contrast of an element's text colour against the first opaque background up its ancestors
export async function contrastOf(page, sel) {
  return page.eval(`(()=>{
    const parse=(c)=>{const m=c.match(/rgba?\\(([^)]+)\\)/);if(!m)return null;const p=m[1].split(',').map(Number);return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1}}
    const lin=(v)=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)}
    const L=(c)=>0.2126*lin(c.r)+0.7152*lin(c.g)+0.0722*lin(c.b)
    let e=document.querySelector(${q(sel)});if(!e)return null
    const fg=parse(getComputedStyle(e).color)
    let bg=null,n=e;while(n&&!bg){const c=parse(getComputedStyle(n).backgroundColor);if(c&&c.a>0.9)bg=c;n=n.parentElement}
    if(!bg)bg={r:15,g:18,b:21,a:1}
    const a=L(fg),b=L(bg);return +((Math.max(a,b)+0.05)/(Math.min(a,b)+0.05)).toFixed(2)})()`)
}
export async function inViewport(page, sel) {
  return page.eval(`(()=>{const e=document.querySelector(${q(sel)});if(!e)return false;e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();
    return r.width>0&&r.height>0&&r.top>=0&&r.left>=0&&r.bottom<=innerHeight&&r.right<=innerWidth})()`)
}
