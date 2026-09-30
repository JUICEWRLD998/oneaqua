// Colour proof for the shipped tokens (styles/tokens.css). Right instrument for each question:
//   legibility against a background -> WCAG contrast ratio
//   "are these two colours different?" -> CIE Lab dE76 (never the ratio)
//   "which is quietest?"              -> Lab chroma (never luminance)
// Writes evidence/colour-proof.md and exits non-zero when a stated requirement fails.
import fs from 'node:fs'
import { contrast, dE76, labChroma, hexToRgb } from '../ui-loops/l1/colour.mjs'

const css = fs.readFileSync('styles/tokens.css', 'utf8')
const tok = {}
for (const m of css.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6});/gi)) tok[m[1]] = m[2].toLowerCase()
const rgb = (k) => { if (!tok[k]) throw new Error('missing token ' + k); return hexToRgb(tok[k]) }

const out = []
const P = (s = '') => out.push(s)
let failed = false

// the control: near-identical pair must read ~1:1 and the same pair far apart must not
const ctl = contrast(hexToRgb('#101010'), hexToRgb('#111111'))
P('# Colour proof')
P()
P(`Source: styles/tokens.css primitives. Control: #101010 on #111111 = ${ctl.toFixed(2)}:1 (must be ~1.0, proves the instrument can see "no contrast").`)
if (ctl > 1.1) failed = true
P()

P('## Text pairs, WCAG contrast (body text needs 4.5:1)')
P()
P('| foreground | background | fg | bg | ratio | result |')
P('|---|---|---|---|---|---|')
const surfaces = ['paper', 'sheet', 'sheet-2']
const textPairs = [
  ...['ink', 'ink-2', 'ink-3'].flatMap((f) => surfaces.map((b) => [f, b])),
  ['accent-ink', 'accent'], ['accent-deep', 'sheet'], ['accent-deep', 'paper'], ['accent-deep', 'sheet-2'],
  ['ink', 'wash-contra'], ['ink-2', 'wash-contra'], ['mark-contra', 'wash-contra'], ['mark-contra', 'sheet'], ['mark-contra', 'paper'],
  ['ink', 'accent-wash'],
]
for (const [f, b] of textPairs) {
  const r = contrast(rgb(f), rgb(b))
  const ok = r >= 4.5
  if (!ok) failed = true
  P(`| ${f} | ${b} | ${tok[f]} | ${tok[b]} | ${r.toFixed(2)}:1 | ${ok ? 'pass' : 'FAIL'} |`)
}

P()
P('## Non-text, WCAG 1.4.11 (3:1). Every verdict mark also carries a shape and a word, so a mark below 3:1 is not load-bearing.')
P()
P('| mark | against | ratio | result |')
P('|---|---|---|---|')
const MARKS = ['confirmed', 'suspected', 'notassessed', 'contra', 'improved', 'nyk', 'confounded']
for (const k of ['focus', 'rule-strong']) for (const b of surfaces) {
  const r = contrast(rgb(k), rgb(b))
  if (k === 'focus' && r < 3) failed = true
  P(`| ${k} | ${b} | ${r.toFixed(2)}:1 | ${r >= 3 ? 'pass' : k === 'focus' ? 'FAIL' : 'below 3:1 (decorative rule)'} |`)
}
for (const v of MARKS) {
  const r = contrast(rgb('mark-' + v), rgb('sheet'))
  P(`| mark-${v} | sheet | ${r.toFixed(2)}:1 | ${r >= 3 ? 'pass' : 'below 3:1, carries shape and word'} |`)
}

P()
P('## Verdict marks are mutually distinct: CIE Lab dE76 for every pair (requirement: >= 20)')
P()
P('| pair | dE76 | result |')
P('|---|---|---|')
let minD = Infinity
for (let i = 0; i < MARKS.length; i++) for (let j = i + 1; j < MARKS.length; j++) {
  const d = dE76(rgb('mark-' + MARKS[i]), rgb('mark-' + MARKS[j]))
  minD = Math.min(minD, d)
  if (d < 20) failed = true
  P(`| ${MARKS[i]} / ${MARKS[j]} | ${d.toFixed(1)} | ${d >= 20 ? 'pass' : 'FAIL'} |`)
}
P()
P(`Minimum dE76 across all ${MARKS.length * (MARKS.length - 1) / 2} pairs: **${minD.toFixed(1)}**.`)

P()
P('## NOT_YET_KNOWABLE is the quietest verdict: Lab chroma C* (quietest first)')
P()
const ch = MARKS.map((v) => ({ v, c: labChroma(rgb('mark-' + v)) })).sort((a, b) => a.c - b.c)
P(ch.map((x) => `${x.v} ${x.c.toFixed(1)}`).join(' < '))
const quiet = ch[0].v === 'nyk'
if (!quiet) failed = true
const ratio = ch[1].c / Math.max(ch[0].c, 0.01)
P()
P(`Quietest: **${ch[0].v}** (${quiet ? 'pass' : 'FAIL'}); the next quietest is ${ratio.toFixed(1)}x louder in chroma.`)
P()
P(failed ? 'RESULT: FAIL' : 'RESULT: PASS')

fs.mkdirSync('evidence', { recursive: true })
fs.writeFileSync('evidence/colour-proof.md', out.join('\n') + '\n')
console.log(out.join('\n'))
process.exit(failed ? 1 : 0)
