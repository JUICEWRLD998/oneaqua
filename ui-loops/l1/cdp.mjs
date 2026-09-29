// Zero-dependency CDP helper (Node 24 global fetch + WebSocket). Used by shoot.mjs and probe.mjs.
import { spawn, execSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { mkdtempSync } from 'node:fs'

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export async function launch(port) {
  const profile = mkdtempSync(join(tmpdir(), 'l1-chrome-'))
  const proc = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--hide-scrollbars',
    '--force-device-scale-factor=1', '--mute-audio', `--user-data-dir=${profile}`,
    `--remote-debugging-port=${port}`, 'about:blank',
  ], { stdio: 'ignore' })
  let ws = null
  for (let i = 0; i < 80 && !ws; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/version`)
      if (r.ok) ws = (await r.json()).webSocketDebuggerUrl
    } catch { /* not up yet */ }
    if (!ws) await sleep(250)
  }
  if (!ws) { kill(proc); throw new Error('chrome did not expose a debugging port ' + port) }
  const sock = new WebSocket(ws)
  await new Promise((res, rej) => { sock.onopen = res; sock.onerror = () => rej(new Error('ws error')) })
  let id = 0
  const waiting = new Map()
  const events = []
  sock.onmessage = (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.id && waiting.has(msg.id)) {
      const { ok, bad } = waiting.get(msg.id)
      waiting.delete(msg.id)
      msg.error ? bad(new Error(JSON.stringify(msg.error))) : ok(msg.result)
    } else if (msg.method) events.push(msg)
  }
  const send = (method, params = {}, sessionId) => new Promise((ok, bad) => {
    const mid = ++id
    waiting.set(mid, { ok, bad })
    sock.send(JSON.stringify({ id: mid, method, params, ...(sessionId ? { sessionId } : {}) }))
  })
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
  const cmd = (m, p) => send(m, p, sessionId)
  await cmd('Page.enable'); await cmd('Runtime.enable')
  const page = {
    cmd, events,
    async open(url, { w, h, scheme = 'light', mobile = false }) {
      await cmd('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile })
      await cmd('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: scheme }] })
      events.length = 0
      await cmd('Page.navigate', { url })
      for (let i = 0; i < 60 && !events.some((e) => e.method === 'Page.loadEventFired'); i++) await sleep(150)
      await cmd('Runtime.evaluate', { expression: 'document.fonts.ready.then(()=>true)', awaitPromise: true })
      await sleep(350)
    },
    async resize(w, h) { await cmd('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false }); await sleep(250) },
    async eval(expression) {
      const r = await cmd('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text)
      return r.result.value
    },
    async shot(file, { full = false } = {}) {
      const { writeFileSync } = await import('node:fs')
      let params = { format: 'png' }
      if (full) {
        const dims = await page.eval('({w: document.documentElement.clientWidth, h: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)})')
        params = { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: dims.w, height: dims.h, scale: 1 } }
      }
      const { data } = await cmd('Page.captureScreenshot', params)
      writeFileSync(file, Buffer.from(data, 'base64'))
    },
    close() { try { sock.close() } catch { /* */ } kill(proc) },
  }
  return page
}

function kill(proc) {
  try {
    if (process.platform === 'win32') execSync(`taskkill /PID ${proc.pid} /T /F`, { stdio: 'ignore' })
    else proc.kill('SIGKILL')
  } catch { /* already gone */ }
}
