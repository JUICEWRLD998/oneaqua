// Score every route over HTTP with the anti-slop-ui scorer (file:// silently drops CSS, so always serve).
// Usage: node e2e/score-routes.mjs <round> <outdir> [port]
import { spawnSync } from 'node:child_process'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { mkdirSync, writeFileSync } from 'node:fs'
import { startServer, stopServer, waitUp, staleCheck } from './lib.mjs'

const [round = '1', out = 'ui-loops/l2/scores', portArg = '3160'] = process.argv.slice(2)
const port = Number(portArg)
const SCORER = join(homedir(), '.claude/skills/anti-slop-ui/scripts/ui-score.mjs')
const hash = spawnSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', '-e', "import {encodeState,initialState} from './state/model'; console.log(encodeState(initialState('firstline')))"], { encoding: 'utf8' }).stdout.trim()
const ROUTES = [['home-empty', '/'], ['home-built', `/#${hash}`], ['new', '/new'], ['casebook', '/casebook'], ['export', '/plan/export'], ['method', '/method']]

mkdirSync(out, { recursive: true })
const server = startServer(port, { OPENROUTER_API_KEY: '', PROPOSER_MODE: 'cached' })
const lines = [`Route scores · round ${round} · ${new Date().toISOString()}`, '']
let worst = 100, fails = 0
try {
  if (!(await waitUp(server.url))) throw new Error('server did not come up')
  const st = await staleCheck(server.url)
  if (st.missing.length) throw new Error('stale server: ' + st.missing.join(','))
  for (const [label, path] of ROUTES) {
    const r = spawnSync(process.execPath, [SCORER, server.url + path, '--round', round, '--label', label, '--out', out, '--port', String(9800 + Math.floor(Math.random() * 90))], { encoding: 'utf8' })
    const txt = (r.stdout + r.stderr).replace(/\x1b\[[0-9;]*m/g, '')
    const score = /SCORE (\d+)\/100/.exec(txt)?.[1]
    const auto = [...txt.matchAll(/\[critical\] ([\w-]+) — ([^\n]*)/g)].map((m) => `${m[1]} (${m[2]})`)
    const major = [...txt.matchAll(/\[major\] ([\w-]+)/g)].map((m) => m[1])
    const guard = /guarded terms[^\n]*\n?[^\n]*/.exec(txt)?.[0]?.replace(/\s+/g, ' ')
    const controls = r.status === 2 || /CONTROL_FAILED/.test(txt)
    if (score) worst = Math.min(worst, Number(score))
    if (auto.length || controls || !score) fails++
    lines.push(`${label.padEnd(11)} ${controls ? 'CONTROL_FAILED (score withheld)' : score ?? 'NO SCORE'}  auto-fail: ${auto.length ? auto.join('; ') : 'none'}  majors: ${major.join(', ') || 'none'}`)
    if (guard) lines.push(`            ${guard}`)
    console.log(lines.at(-2))
  }
} finally {
  stopServer(server)
}
lines.push('', `worst route score ${worst}; routes with auto-fails/failed controls: ${fails}`)
writeFileSync(join(out, `summary-r${round}.txt`), lines.join('\n') + '\n')
console.log(lines.at(-1))
