// Writes the contrast table, the dE76 matrix and the chroma ordering for every direction.
// Usage: node measure-palette.mjs [--md]   (prints; --md emits markdown tables for measurements.md)
import { palettes, VERDICTS } from './palettes.mjs'
import { oklchToRgb, contrast, dE76, labChroma, toHex } from './colour.mjs'

const md = process.argv.includes('--md')
const out = []
const P = (s = '') => out.push(s)

export function analyse(key) {
  const p = palettes[key]
  const rgb = Object.fromEntries(Object.entries(p.tokens).map(([k, v]) => [k, oklchToRgb(v)]))
  const hex = (k) => toHex(rgb[k])
  const textPairs = [
    ['ink', 'paper'], ['ink', 'sheet'], ['ink', 'sheet-2'], ['ink-2', 'paper'], ['ink-2', 'sheet'], ['ink-2', 'sheet-2'],
    ['ink-3', 'paper'], ['ink-3', 'sheet'], ['ink-3', 'sheet-2'],
    ['accent-ink', 'accent'], ['accent-deep', 'sheet'], ['accent-deep', 'paper'], ['accent-deep', 'accent-wash'],
    ['ink', 'accent-wash'], ['ink', 'wash-contra'], ['mark-contra', 'wash-contra'], ['mark-contra', 'sheet'],
  ]
  const nonText = [
    ['focus', 'paper'], ['focus', 'sheet'], ['focus', 'sheet-2'], ['rule-strong', 'sheet'], ['rule-strong', 'paper'],
    ...VERDICTS.map((v) => ['mark-' + v, 'sheet']),
  ]
  const rows = (pairs) => pairs.map(([f, b]) => ({ f, b, ff: hex(f), bb: hex(b), r: contrast(rgb[f], rgb[b]) }))
  const de = []
  for (let i = 0; i < VERDICTS.length; i++) for (let j = i + 1; j < VERDICTS.length; j++)
    de.push({ a: VERDICTS[i], b: VERDICTS[j], d: dE76(rgb['mark-' + VERDICTS[i]], rgb['mark-' + VERDICTS[j]]) })
  const chroma = VERDICTS.map((v) => ({ v, c: labChroma(rgb['mark-' + v]), oklchC: p.tokens['mark-' + v][1] })).sort((a, b) => a.c - b.c)
  return { p, rgb, hex, text: rows(textPairs), nonText: rows(nonText), de, chroma }
}

for (const key of Object.keys(palettes)) {
  const a = analyse(key)
  P(`## ${key} — ${a.p.name}`)
  P()
  P('Text pairs (WCAG 2.1 contrast; body needs 4.5:1)')
  P()
  if (md) { P('| foreground | background | fg hex | bg hex | ratio | verdict |'); P('|---|---|---|---|---|---|') }
  for (const r of a.text) P(md ? `| ${r.f} | ${r.b} | ${r.ff} | ${r.bb} | ${r.r.toFixed(2)}:1 | ${r.r >= 4.5 ? 'pass' : 'FAIL'} |` : `${r.f} on ${r.b} ${r.r.toFixed(2)}:1 ${r.r >= 4.5 ? 'ok' : 'FAIL'}`)
  P()
  P('Non-text marks against the sheet (WCAG 1.4.11, 3:1)')
  P()
  if (md) { P('| mark | against | ratio | verdict |'); P('|---|---|---|---|') }
  for (const r of a.nonText) P(md ? `| ${r.f} | ${r.b} | ${r.r.toFixed(2)}:1 | ${r.r >= 3 ? 'pass' : 'below 3:1 (paired with a shape and a text label)'} |` : `${r.f} on ${r.b} ${r.r.toFixed(2)}:1`)
  P()
  P('Verdict marks, CIE Lab dE76 between every pair (must be >= 20)')
  P()
  const min = Math.min(...a.de.map((x) => x.d))
  if (md) { P('| pair | dE76 | verdict |'); P('|---|---|---|') }
  for (const x of a.de) P(md ? `| ${x.a} / ${x.b} | ${x.d.toFixed(1)} | ${x.d >= 20 ? 'pass' : 'FAIL'} |` : `${x.a}/${x.b} ${x.d.toFixed(1)} ${x.d >= 20 ? '' : 'FAIL'}`)
  P()
  P(`minimum dE76: ${min.toFixed(1)}`)
  P()
  P('Chroma ordering of verdict marks (Lab C*, quietest first). NOT_YET_KNOWABLE must be first.')
  P()
  P(a.chroma.map((c) => `${c.v} ${c.c.toFixed(1)}`).join(' < '))
  P(`quietest: ${a.chroma[0].v} — ${a.chroma[0].v === 'nyk' ? 'pass' : 'FAIL'}`)
  P()
}
if (import.meta.url === new URL(process.argv[1], 'file:///').href || process.argv[1].endsWith('measure-palette.mjs')) console.log(out.join('\n'))
