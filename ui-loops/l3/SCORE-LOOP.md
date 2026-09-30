# UI loop 3 (refine): measured deltas only, 2026-09-30

Input: the critic's weakest-element list from loop 2 round A, plus the lowest axis (Execution). No new features, no restyle.

## Critic, round B (blind, fresh agent, after the loop-2 fixes)
Totals: s1 22, s2 20, s3 17, s4 21, s5 18, s6 24 (mean 20.3/30). Weakest axis overall: **Execution** (Variety close second).
Weakest elements: source chips breaking line boxes everywhere; s5 link-button wrapping with stray padding; s3 stray "0" numeral and
ungrouped select wall; s2 hero CTA louder than the chart; mobile nav eating ~220px in three rows; orphan 7th casebook card; chart
axis caption touching ticks and a mostly empty top band.

## Fixes applied (this loop)
Chip box 28px with a 44px hit area via `::after` (no more line-height inflation); link-buttons `inline-flex`, no underline; `/new`
evidence grouped by stressor in collapsible sections (first open), stray numeral removed; chart leads with the hero verdict below it;
hero rows on a fixed 3-column grid so chips align; profile cropped above the labels, caption clear of the ticks, flow arrow moved;
mobile nav one row with short labels; casebook picker is a list; method quotes stack their chip; export summary lighter, inputs hinted.

## Measured after the fixes
| Check | Result |
|---|---|
| ui-score, six surfaces, worst | **91**, 0 auto-fails (unchanged from loop 2: the ceiling in URL mode, so the composite delta is 0) |
| Width sweep 320/375/414/768/1280, six routes | no horizontal overflow; planted 2000px control caught (`evidence/width-sweep.txt`) |
| Fixture journeys | 7/7 green, every planted failure fails (`evidence/e2e-journeys.txt`) |
| Colour proof (`node scripts/colour-proof.mjs`) | min dE76 **26.0** across all 21 verdict pairs; NOT_YET_KNOWABLE quietest by Lab chroma (2.9, next 16.3, 5.6x); `evidence/colour-proof.md` |
| Guarded terms | focus ring 8/8, text contrast 19.86/20 unchanged |

## Not done, stated plainly
- **A second critic pass after the fixes did not complete** (the API was unreachable mid-run). So the fixes above are verified by the
  machine gates and by my own screenshots, **not** by a fresh blind critic. The last critic scores (mean 20.3/30, Execution
  weakest) are pre-fix. The P7 bar "every critic axis >= 4" is therefore **not demonstrated**. Re-run: shoot with
  `node e2e/shoot-routes.mjs <port> ui-loops/l3/critic2` (files already captured) and hand them to one fresh agent.
- The P7 bar "every route >= 92" is not reachable in URL mode (ceiling ~91, see loop 2); it cannot be claimed.
- Plateau: machine composite moved 0.0 between rounds, so the stop rule fires. Loop 3 closes here; there is no loop 4.
