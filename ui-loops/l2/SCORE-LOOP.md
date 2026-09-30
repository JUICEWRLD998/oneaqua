# UI loop 2 (commit): the full app in D2 Long Section, 2026-09-30

Scored over HTTP (`node e2e/score-routes.mjs <round> <out>`), because the scorer reads no CSS from file://.
Instrument ceiling: in URL mode the source-scan terms (`tokenDiscipline`, `stateCoverage`) report "unknown" and cap at half
credit, so ~91 is the practical maximum for a route here. Scores are comparable only within this mode.

| Round | Change | Worst route | Auto-fails |
|---|---|---|---|
| 1 | first build | 76 (method) | sibling-same-colour x4, three-equal-columns, no stamp |
| 2 | macrostructure stamp as a custom property, field surface, casebook grid, universal disabled style, chip hover two groups | 79 (new) | sibling-same-colour (new, export) |
| 3 | field surface distinct from both panel surfaces | 83 (export) | none |
| 4 | empty export state gets a real next action | **91** | none |

All six surfaces (home empty, home built, /new, /casebook, /plan/export, /method) score 91 with 0 auto-fails. Gate was 88.

## Critic, round A (blind, fresh agent, 18 screenshots)
Totals: s1 23, s2 19 (capture artifact, see below), s3 21, s4 20, s5 19, s6 25. Weakest axis: Execution and Variety.

Findings that were real and are fixed (see loop 3): the hero chart timid and with no cited verdict above the fold; mobile profile
labels colliding; citation chips breaking line height; `/new` an ungrouped wall of selects; casebook cards clipping on mobile and
"1 measures"; the rail ending at 100vh; method chips breaking the flat system.

**Capture artifact, and the real bug behind it:** s2 ("empty ladder") matched s1 because my capture visited the shared-link
hash first and the store persisted it. Digging further found a real defect: opening a shared link in a tab already on the site is a
same-document navigation, so the store never re-read the hash. Fixed with a `hashchange` listener, pinned by e2e journey 7.

## Other defects found by the gates (not by eye)
- **Override could never reach SIGNABLE** (e2e journey 3). Engine semantics changed, recorded in DECISIONS.md under P6.
- **Two real 320px overflows** (width sweep): method vocabulary grid, export resource-count chips.
