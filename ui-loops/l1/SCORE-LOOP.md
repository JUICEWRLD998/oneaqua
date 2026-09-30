# UI loop 1 (diverge): result, 2026-09-30

Scored over HTTP (file:// silently drops all CSS, see the anti-slop-ui instrument-traps note), round 5, 0 auto-fail tells each.
Critic: one fresh blind agent, shots anonymised A=D3, B=D1, C=D2, screenshots only.

| Direction | Machine | Critic (Phil/Hier/Exec/Spec/Restr/Var) | Critic total |
|---|---|---|---|
| **D2 Long Section** (dark, side rail) | **86** | 4/4/4/5/4/5 | **26/30** |
| D3 Formulary (warm paper, monograph) | 88 | 4/4/3/3/4/4 | 22/30 |
| D1 Survey Sheet (cool paper, form) | 85 | 3/4/3/4/3/3 | 20/30 |

**Winner: D2.** All three qualify (>=80, 0 auto-fails); the machine can disqualify but not win, so the critic ranks.
Audience question ("which would a freshwater ecologist trust in 10 seconds"): D2, because the reach is drawn first, with
control, outfall and impact and the distance between them. Caveat from the critic: D2's dark look is slightly dashboard-y
for municipal approvers; D3's paper look suits them best.

Why the others lost:
- **D3:** first screen has nothing river-shaped; stressor list misaligns; follow-up charts tiny; a red panel off the calm tone.
- **D1:** drifts between form, report and dashboard; ladder columns too narrow (word-per-line); rotated stamp crowds the
  refusal; too many outlined boxes; longest page.

## First fixes for loop 2 (critic's weakest elements, on D2)
1. The long-section graphic is timid: add scale, put S01/S07 at positions on the reach, raise label size; on mobile it
   shrinks to ~4px text, so redraw a mobile variant.
2. Follow-up row: third column cramped, "delta" label collides with the point in the contrast plot.
3. Empty-rung rows take too much space; "withheld" should not read as an error.
4. Accent census: keep dark surfaces near-neutral (chroma <= 0.008) or the scorer reads the accent budget as blown.

## Defect found in the losing sketches (not in D2)
`[object Object]` in D3 Indications lines: the plan's `objective` object overwrites the measure's objective string in
`lib.mjs` `firstline.measures`. Do not carry that join into the real app.

Owner override: pick stands unless you say otherwise.
