#!/usr/bin/env node
// One command: shape + cites + planted-control selftest. Exit non-zero if any step fails.
import { spawnSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const steps = [
  ['shape', 'verify-catalogue-shape.mjs', []],
  ['cites', 'verify-d24-cites.mjs', []],
  ['selftest (real data passes AND planted bad cite fails)', 'verify-d24-cites.mjs', ['--selftest']],
]
let bad = 0
for (const [label, file, args] of steps) {
  const r = spawnSync(process.execPath, [join(here, file), ...args], { encoding: 'utf8' })
  process.stdout.write(r.stdout)
  process.stderr.write(r.stderr)
  console.log(`[${r.status === 0 ? 'PASS' : 'FAIL'}] ${label}`)
  if (r.status !== 0) bad++
}
console.log(bad ? `verify-data: ${bad} step(s) FAILED` : 'verify-data: all steps passed')
process.exit(bad ? 1 : 0)
