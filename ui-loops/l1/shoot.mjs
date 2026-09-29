// Screenshot driver. Usage: node shoot.mjs [d1 d2 d3] [--port 9420]
// Produces shots/<dir>-desktop.png (1280x800 viewport), <dir>-desktop-full.png, <dir>-mobile.png (375x812), <dir>-mobile-full.png.
// The colour scheme is set explicitly per direction (headless defaults are not to be trusted).
import { pathToFileURL } from 'node:url'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdirSync } from 'node:fs'
import { launch } from './cdp.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const pi = args.indexOf('--port')
const port = pi > -1 ? Number(args[pi + 1]) : 9420 + Math.floor(Math.random() * 60)
const dirs = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--port')
const which = dirs.length ? dirs : ['d1', 'd2', 'd3']
const SCHEME = { d1: 'light', d2: 'dark', d3: 'light' }
// optional interaction states to photograph (id of an element to focus/hover before the shot)
mkdirSync(join(here, 'shots'), { recursive: true })

const page = await launch(port)
try {
  for (const d of which) {
    const url = pathToFileURL(resolve(here, d, 'index.html')).href
    for (const [label, w, h] of [['desktop', 1280, 800], ['mobile', 375, 812]]) {
      await page.open(url, { w, h, scheme: SCHEME[d] })
      await page.shot(join(here, 'shots', `${d}-${label}.png`))
      await page.shot(join(here, 'shots', `${d}-${label}-full.png`), { full: true })
      const dims = await page.eval('[document.documentElement.scrollHeight, document.documentElement.clientWidth].join("x")')
      console.log(`${d} ${label} ok (page ${dims})`)
    }
  }
} finally {
  page.close()
}
