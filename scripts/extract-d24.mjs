#!/usr/bin/env node
// Downloads D2.4 (if not cached), runs pdftotext, writes per-printed-page text to data/d24/_review/pages/<n>.txt.
// Zero npm deps. Cache dir: env D24_CACHE or <os tmp>/oah-d24.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const PAGES_DIR = join(ROOT, 'data', 'd24', '_review', 'pages')
const URL_ = 'https://zenodo.org/records/20040211/files/OAH_Catalogue%20of%20measures.pdf?download=1'
const HEAD = /^\s*D2\.4 Catalogue of measures for urban aquatic ecosystems rehabilitation\s+(\d{1,3})\s*$/m

export async function extract({ force = false } = {}) {
  const cache = process.env.D24_CACHE || join(tmpdir(), 'oah-d24')
  mkdirSync(cache, { recursive: true })
  const pdf = join(cache, 'd24.pdf')
  const txt = join(cache, 'd24.txt')
  if (!existsSync(pdf)) {
    const r = await fetch(URL_, { redirect: 'follow', headers: { 'user-agent': 'curl/8.0', accept: '*/*' } })
    if (!r.ok) throw new Error('download failed ' + r.status)
    writeFileSync(pdf, Buffer.from(await r.arrayBuffer()))
  }
  if (force || !existsSync(txt)) execFileSync('pdftotext', ['-layout', '-enc', 'UTF-8', pdf, txt])
  const raw = readFileSync(txt, 'utf8').split('\f')
  // Offset rule: cite the PRINTED number from the running head. Pages without a head (cover, blank) are skipped
  // and reported; they are never cited.
  rmSync(PAGES_DIR, { recursive: true, force: true })
  mkdirSync(PAGES_DIR, { recursive: true })
  const map = new Map()
  const unheaded = []
  raw.forEach((t, i) => {
    const m = t.match(HEAD)
    if (!m) { if (t.trim()) unheaded.push(i + 1); return }
    const n = Number(m[1])
    map.set(n, map.has(n) ? map.get(n) + '\n' + t : t)
  })
  for (const [n, t] of map) writeFileSync(join(PAGES_DIR, n + '.txt'), t)
  // Section slices for human review
  const rev = join(ROOT, 'data', 'd24', '_review')
  const slice = (name, a, b) => writeFileSync(join(rev, name + '.txt'),
    [...map.keys()].sort((x, y) => x - y).filter(n => n >= a && n <= b).map(n => `=== printed p.${n} ===\n${map.get(n)}`).join('\n'))
  slice('sec2-hierarchy', 19, 27)
  slice('sec3-stressors', 28, 30)
  slice('sec4-measures', 31, 110)
  slice('sec5-casestudies', 111, 131)
  return { pages: map.size, unheaded, total: raw.length }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const r = await extract({ force: process.argv.includes('--force') })
  console.log(`pages written: ${r.pages}; pdf pages: ${r.total}; pages without running head (skipped): ${r.unheaded.join(',') || 'none'}`)
}
