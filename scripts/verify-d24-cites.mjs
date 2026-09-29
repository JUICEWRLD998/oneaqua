#!/usr/bin/env node
// Asserts that every {page, quote-like} object under data/ quotes text that really appears on that PRINTED D2.4 page.
//   node scripts/verify-d24-cites.mjs             verify real data (skips _review/ and _controls/)
//   node scripts/verify-d24-cites.mjs --controls  verify data/_controls/ only. MUST exit non-zero (planted bad cite).
//   node scripts/verify-d24-cites.mjs --selftest  real data must exit 0 AND controls must exit non-zero
// Quote-like fields: quote, d24Text, objective, limitations. A field F may carry its own page in `${F}Page`
// (e.g. limitationsPage) when the text sits on a later page than the measure heading; otherwise `page` is used.
// Zero npm dependencies.
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { extract, PAGES_DIR, ROOT } from './extract-d24.mjs'

const QUOTE_FIELDS = ['quote', 'd24Text', 'objective', 'limitations']
const NOT_STATED = 'not stated in D2.4'
const DATA = join(ROOT, 'data')

/** Whitespace-, hyphen- and ligature-insensitive form. Removing every hyphen and every space makes a genuine
 *  hyphen ("re-establish") and a line-wrap hyphen ("re-\nestablish") compare equal on both sides. */
export function normalise(s) {
  return String(s)
    .normalize('NFKC') // folds fi/fl/ff ligature code points to plain letters
    .replace(/[ﬀﬁﬂﬃﬄ]/g, m => ({ 'ﬀ': 'ff', 'ﬁ': 'fi', 'ﬂ': 'fl', 'ﬃ': 'ffi', 'ﬄ': 'ffl' }[m]))
    .replace(/[‘’‚‛′`´]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/[-‐‑‒–—―−­]/g, '') // hyphen, en/em dash, minus, soft hyphen
    .replace(/[▪•●​‌‍﻿]/g, '') // bullets, zero-width
    .replace(/\s+/g, '')
    .toLowerCase()
}

function walkJson(dir, { controls }) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) {
      if (name === '_review') continue
      if (name === '_controls' && !controls) continue
      out.push(...walkJson(p, { controls }))
    } else if (name.endsWith('.json')) out.push(p)
  }
  return out
}

function* objects(node, path) {
  if (node && typeof node === 'object') {
    if (!Array.isArray(node)) yield [node, path]
    for (const [k, v] of Object.entries(node)) yield* objects(v, `${path}${Array.isArray(node) ? `[${k}]` : `.${k}`}`)
  }
}

let pageCache = null
async function loadPages() {
  if (pageCache) return pageCache
  if (!existsSync(PAGES_DIR) || readdirSync(PAGES_DIR).length < 100) await extract()
  pageCache = new Map()
  for (const f of readdirSync(PAGES_DIR)) {
    const m = f.match(/^(\d+)\.txt$/)
    if (m) pageCache.set(Number(m[1]), normalise(readFileSync(join(PAGES_DIR, f), 'utf8')))
  }
  return pageCache
}

export async function verify({ controls = false } = {}) {
  const pages = await loadPages()
  const root = controls ? join(DATA, '_controls') : DATA
  const files = existsSync(root) ? walkJson(root, { controls }) : []
  const misses = []
  let checked = 0
  for (const file of files) {
    const json = JSON.parse(readFileSync(file, 'utf8'))
    for (const [obj, path] of objects(json, '$')) {
      // casebook: verbatim `unmapped` strings with parallel `unmappedPages`
      if (Array.isArray(obj.unmapped)) {
        if (!Array.isArray(obj.unmappedPages) || obj.unmappedPages.length !== obj.unmapped.length) misses.push(`${relative(ROOT, file)} ${path}.unmapped: needs a parallel unmappedPages array`)
        else obj.unmapped.forEach((q, i) => {
          checked++
          if (!(pages.get(obj.unmappedPages[i]) ?? '').includes(normalise(q))) misses.push(`${relative(ROOT, file)} ${path}.unmapped[${i}] (p.${obj.unmappedPages[i]}): quote not found on that page: "${q.slice(0, 90)}"`)
        })
      }
      if (typeof obj.page !== 'number') continue
      // A measure's `page` must be the page where its numbered heading is printed (not the contents).
      if (typeof obj.id === 'string' && /^4\.\d\.\d+$/.test(obj.id) && typeof obj.name === 'string') {
        checked++
        const head = normalise(obj.id + obj.name).slice(0, normalise(obj.id).length + 12)
        if (!(pages.get(obj.page) ?? '').includes(head)) misses.push(`${relative(ROOT, file)} ${path}.page (p.${obj.page}): heading "${obj.id} ${obj.name}" not printed on that page`)
      }
      for (const f of QUOTE_FIELDS) {
        const q = obj[f]
        if (typeof q !== 'string' || q === NOT_STATED) continue
        const pg = typeof obj[`${f}Page`] === 'number' ? obj[`${f}Page`] : obj.page
        checked++
        const where = `${relative(ROOT, file)} ${path}.${f} (p.${pg})`
        const text = pages.get(pg)
        if (text === undefined) { misses.push(`${where}: no such printed page in the extraction`); continue }
        if (!text.includes(normalise(q))) misses.push(`${where}: quote not found on that page: "${q.slice(0, 90)}${q.length > 90 ? '…' : ''}"`)
      }
    }
  }
  return { checked, misses, files: files.length }
}

function selftest() {
  const here = fileURLToPath(import.meta.url)
  const run = args => spawnSync(process.execPath, [here, ...args], { encoding: 'utf8' })
  // normaliser unit checks: wrap hyphen, real hyphen, double space, dashes, curly quotes, ligature code points
  const eq = [
    ['socio-\neconomic', 'socio-economic'], ['a  b', 'a b'], ['2–3', '2-3'], ['won’t', "won't"],
    ['ﬁnd ﬂow', 'find flow'], ['“x”', '"x"'],
  ]
  for (const [a, b] of eq) if (normalise(a) !== normalise(b)) { console.error(`selftest: normaliser mismatch ${JSON.stringify(a)} vs ${JSON.stringify(b)}`); return 1 }
  const good = run([])
  const bad = run(['--controls'])
  console.log(`selftest: real data exit=${good.status} (want 0); controls exit=${bad.status} (want non-zero)`)
  if (good.status !== 0) { console.error(good.stdout + good.stderr); return 1 }
  if (bad.status === 0) { console.error('selftest FAILED: the planted bad cite was accepted, so this verifier is blind'); return 1 }
  if (!/quote not found|no such printed page/.test(bad.stdout + bad.stderr)) { console.error('selftest FAILED: controls failed for the wrong reason'); return 1 }
  return 0
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2)
  if (args.includes('--selftest')) process.exit(selftest())
  const controls = args.includes('--controls')
  const { checked, misses, files } = await verify({ controls })
  console.log(`verify-d24-cites${controls ? ' --controls' : ''}: ${files} file(s), ${checked} quoted field(s) checked, ${misses.length} miss(es)`)
  for (const m of misses) console.log('  MISS ' + m)
  if (controls && checked === 0) { console.error('controls file yielded nothing to check: the control is not planted'); process.exit(2) }
  if (!controls && checked === 0) { console.error('nothing checked: an empty scan is not a pass'); process.exit(3) }
  process.exit(misses.length ? 1 : 0)
}
