// node e2e/shoot-routes.mjs <port> <outdir>
// -> anonymised s1..s6: desktop viewport, desktop full page, mobile viewport. Every shot starts from CLEAN storage
// (the store persists to sessionStorage, which once made an "empty ladder" shot show the previous shot's plan).
import { launch } from './cdp.mjs'
import { mkdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
const [port, out] = process.argv.slice(2)
mkdirSync(out, { recursive: true })
const hash = spawnSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', '-e', "import {encodeState,initialState} from './state/model'; console.log(encodeState(initialState('firstline')))"], { encoding: 'utf8' }).stdout.trim()
const R = [['s1', `/#${hash}`], ['s2', '/'], ['s3', '/new'], ['s4', '/casebook'], ['s5', '/plan/export'], ['s6', '/method']]
const page = await launch(9900 + Math.floor(Math.random() * 40))
const settle = () => page.eval('new Promise(r=>setTimeout(r,600))')
try {
  for (const [n, path] of R) {
    for (const [tag, w, h, full] of [['desktop', 1280, 800, false], ['desktop-full', 1280, 800, true], ['mobile', 375, 812, false]]) {
      await page.open(`http://localhost:${port}/`, { w, h, scheme: 'dark' })
      await page.eval('sessionStorage.clear()')
      await page.open(`http://localhost:${port}${path}`, { w, h, scheme: 'dark' })
      await settle()
      await page.shot(`${out}/${n}-${tag}.png`, { full })
    }
    console.log(n, 'ok', path.slice(0, 20))
  }
} finally { page.close() }
