# Firstline — implementation

Execution plan for the build agent (Claude Sonnet). Read `ideation.md` first. It is the contract: the pitch, the
rules R1–R8, the verdict vocabulary and the claims to avoid all live there. This file says **how, in what order,
and what "done" means** for each phase.

**Deadline:** Oct 4, 2026 21:00 PDT. **Internal freeze:** Oct 4 09:00 PDT. **Fallback switch date:** Oct 1 18:00 PDT
(ideation §9).

---

## 0 · Rules for the build agent (read before any code)

1. **Load these skills when their phase starts. Do not rely on auto-trigger:** `test-driven-development` (P2–P4),
   `masayume-ui-craft` (P5), **`anti-slop-ui` (P5–P7:
   the three UI loops are defined there, in `references/score-loop.md`)**, `product-hardening` (P8), `humanizer`
   (P9 prose).
2. **The engine owns every verdict.** No LLM output may set a stressor status, a measure verdict or an outcome
   verdict. A test enforces this (P2.9).
3. **Build the adjudicator before wiring the model.** The app must demo end-to-end with `ANTHROPIC_API_KEY` unset.
4. **Every catalogue fact carries its D2.4 page.** No measure, stressor or rule enters the data files without a
   `page` field. A test enforces this.
5. **No invented numbers.** No threshold, statistic or legal article goes in unless it has been read at its source.
   If a threshold is missing, the item can only produce `SUSPECTED`, never `CONFIRMED`.
6. **Scenario data is labelled at creation time.** Every fixture record has `provenance: "scenario"`, and the UI
   renders the label wherever the record appears.
7. **`DECISIONS.md` starts before the first commit.** Newest first, one entry per pass. Every bullet has a
   measurement, the rejected alternative, and the file or test that pins it. Wrongness gets a new entry; old
   entries are never edited.
8. **UI claims need a browser.** Drive headless Chrome over CDP and screenshot. A grep of built HTML is not
   evidence that a button is visible. (`anti-slop-ui/scripts/ui-score.mjs` does this; see P5.)
9. **Parallel fan-out:** the orchestrator builds the shared foundation (P0 and the P1 data contracts) first. Then
   one subagent per **disjoint file set**, as marked `⟂` below. The orchestrator re-verifies and merges.

---

## 1 · Stack and layout

| Concern | Choice | Why |
|---|---|---|
| App | Next.js (App Router) + TypeScript, strict | One deploy, server route for the proposer |
| Styling | **CSS Modules + one `tokens.css`. No Tailwind** | Owner's standing preference |
| Motion | **Framer Motion only**, ≤3 primitives, all gated on `prefers-reduced-motion` | Owner's standing preference |
| Engine | Pure TS in `engine/`, zero runtime deps, seeded PRNG | Replayable, testable, offline |
| Tests | Vitest (engine) + a zero-dependency CDP journey driver (UI) | |
| LLM | **OpenRouter** (`https://openrouter.ai/api/v1/chat/completions`, plain `fetch`, no SDK), model `google/gemini-2.5-flash` (env `OPENROUTER_MODEL`), key in `OPENROUTER_API_KEY`, JSON-schema structured output | Proposer only. Owner decision 2026-09-29: no Anthropic in the product |
| Deploy | Vercel (live URL is part of the idea, not packaging) | |
| Persistence | None server-side. Plans live in `localStorage`, and plan state is shareable through a URL hash | No DB means no seams |

```
firstline/
  DECISIONS.md  CLAIMS.md  README.md  LICENSE (MIT; D2.4 content attributed CC-BY 4.0 in NOTICE)
  NOTICE                          ← attribution for D2.4, Key Indicators, Field Protocols
  data/
    d24/stressors.json            12 stressors (D2.4 §3, p.30)
    d24/measures.json             43 measures (D2.4 §4, p.31–110)
    d24/rules.json                R1–R8 parameters + citations
    d24/casebook.json             D2.4 §5 case studies encoded as plans
    items/checkup-items.json      citizen/field items → stressor evidence (per ideation §9 Q1 branch)
    scenario/vale-reach.json      demo reach, impact + control, 18 months of check-ups (provenance: scenario)
    SOURCES.md                    every source, DOI, fetch date, extraction command
  scripts/
    extract-d24.mjs               pdftotext → section slices → review sheet (human-in-the-loop encoding)
    verify-d24-cites.mjs          asserts every page cite's quoted phrase appears on that page's text
  engine/
    types.ts  diagnose.ts  prescribe.ts  followup.ts  verdict.ts  fhir.ts  prng.ts  index.ts
    __tests__/…                   one file per module + controls.test.ts
  app/                            Next routes (see P6)
  components/                     one folder per component, each with its .module.css
  styles/tokens.css  styles/globals.css
  e2e/driver.mjs  e2e/journeys.mjs
  ui-loops/                       loop artifacts: sketches, scores, screenshots, SCORE-LOOP.md
```

**One-command verify** (package.json):
`"verify": "npm run typecheck && npm run lint && npm test && node scripts/verify-d24-cites.mjs && npm run build"`

---

## P0 · Foundation (orchestrator, ~1h) — Sep 30 AM

- `git init`, public GitHub repo `firstline`, first commit containing only `DECISIONS.md`, `CLAIMS.md`,
  `ideation.md`, `implementation.md`, and the README skeleton (P9 section order, content TBD).
- Next app scaffold without Tailwind; strict TS; Vitest; ESLint.
- Resolve the three **decisive questions** (ideation §9) under their time caps, and record the branch taken in
  `DECISIONS.md`:
  - **Q1:** find the OAH citizen assessment items. Look at `github.com/hl7-eu/oah` → `input/fsh` or `input/resources`
    for a `Questionnaire`, then `build.fhir.org/ig/hl7-eu/oah`, then `apps.oneaquahealth.eu`. Otherwise fall back
    to the Field Sampling Protocols field form (Zenodo 20344421).
  - **Q2:** Bernhardt et al. 2005 at source.
  - **Q3:** OAH IG profiles, and **how the IG models the ecosystem as a FHIR subject**. See P3 for the R4 subject
    constraint that makes this matter.
- Re-confirm the deadline on the Devpost page.
- **Done when:** repo is public and pushed (check with `git ls-remote`, not the push exit code), `npm run verify`
  is green on the empty scaffold, and three Q-entries are in DECISIONS.md.

---

## P1 · Encode the catalogue (orchestrator + 1 reviewer subagent, ~4h) — Sep 30

The data files are the product's knowledge. Accuracy here is worth more than any feature.

1. `scripts/extract-d24.mjs`: download D2.4 from Zenodo
   (`https://zenodo.org/records/20040211/files/OAH_Catalogue%20of%20measures.pdf?download=1`), run
   **`pdftotext -layout -enc UTF-8`** (on PATH at `/mingw64/bin/pdftotext`), and slice the text by section number.
   Without `-enc UTF-8`, accented names come out as `�` (Sónia, Bièvre), and quote verification will fail on them.
   `research/d24-catalogue-of-measures.txt` is a quick-look copy made without that flag, so don't cite from it. Emit `data/d24/_review/<section>.txt`.
   **Page numbers:** the printed page in the running head (`D2.4 Catalogue … <n>`) is the one to cite. Build a
   `page → text` map from the running heads.
2. **stressors.json:** 12 entries, `S01`–`S12`, in the order D2.4 §3 lists them (Feio & Ferreira 2019): water
   pollution; connectivity barriers; altered hydrology; geomorphological change; artificialisation of channel and
   banks; floodplain occupation; riparian removal/degradation; lack of aquatic habitats; linearisation;
   altered physico-chemistry; degraded biological communities; catchment pressures.
   Fields: `id, name, d24Text (verbatim), page, firstLine: boolean, citizenObservable: boolean`.
   `firstLine` = the stressors D2.4 p.19 names as unconditional first-line concerns: water quality (S01) and riparian function (S07). Hydrological/sealing pressures are first-line only "where feasible", so S03 does not gate (DECISIONS 2026-09-29 integration). **Log the mapping decision in DECISIONS.md.** It is interpretation, and a judge
   may ask.
3. **measures.json:** the 43 numbered measures (4.1.1–4.7.3). Sub-variants (rock-ramp, J-hook vane…) go in
   `variants[]`. Fields:
   `id ("4.3.3"), name, line ("L1"|"L2"|"L3"|"L4"|"C-hydro"|"C-chem"), addresses: StressorId[], scale[],
    objective (verbatim ≤40 words), limitations (verbatim ≤40 words), page, citizenMonitorable: IndicatorId[],
    responseLag: "fast"|"medium"|"slow", establishmentYears?: number`.
   Line mapping comes from section headings: 4.1, 4.2 → L1 · 4.3 → L2 · 4.4 → L3 · 4.5 → L4 · 4.6 → C-hydro ·
   4.7 → C-chem.
   **Known tension, and it must be surfaced, not hidden:** D2.4 p.19 includes *"reduction of … altered surface runoff
   pathways and highly sealed urban surfaces"* in the first line, but lists rain gardens, permeable pavements and
   similar measures under §4.6 *Compensatory: hydrological*. Encode them by section (C-hydro). Mark them
   `note: "D2.4 p.19 also names sealing reduction as first-line; see DECISIONS"`, and show the note in the UI.
   `addresses` is encoded by **reading each measure's objective text**. Each mapping is reviewed (step 6).
4. **rules.json:** R1–R8 as data: `{id, name, verdict, page, quote}` plus parameters (e.g. R7 `establishmentYears:
   2–3` from p.26). `quote` is the exact sentence and must pass `verify-d24-cites`.
5. **casebook.json:** encode each D2.4 §5 case study (5.1.1 Bièvre … 5.1.7 CresceRio) as a plan: the stressors
   the text reports, the measures in the order the text reports them, and whether the text reports baseline or
   after-monitoring data. Every field cites a page. Where the text is silent, write `null` + `"not stated in D2.4"`,
   **never a guess**.
6. **⟂ Reviewer subagent** (fresh context, read-only on the JSON): re-read every `addresses` mapping and casebook
   field against the review slices, and list disagreements. The orchestrator resolves each one in DECISIONS.md.
7. **items/checkup-items.json** (per the Q1 branch): each item has `id, text (verbatim from source), source,
   answers[], evidence: [{answer, stressor, strength: "confirm"|"suggest"}]`. A single citizen answer can only
   `suggest`. `confirm` needs a field reading with a **sourced** threshold (Key Indicators factsheets, Zenodo
   20345207) or ≥2 independent check-ups. If no threshold exists in the source, the item cannot confirm.
8. `scripts/verify-d24-cites.mjs`: for every `{page, quote}` anywhere in `data/`, assert that the normalised quote
   is a substring of that page's text. **Planted positive control:** a deliberately wrong cite in
   `data/_controls/bad-cite.json` must make the script exit non-zero (run with `--controls`).

**Done when:** `verify-d24-cites` passes on real data and fails on the planted control; 12 stressors, 43 measures,
8 rules and ≥7 casebook plans are encoded; the reviewer's disagreement list is resolved.

---

## P2 · The engine (TDD, ⟂ one subagent per module after `types.ts` lands) — Sep 30 PM → Oct 1

Orchestrator writes `engine/types.ts` first (the contract), then fans out.

```ts
type StressorStatus = "CONFIRMED" | "SUSPECTED" | "NOT_ASSESSED"
type MeasureVerdict = "INDICATED" | "CONTRAINDICATED" | "DEFERRED" | "SYMPTOM_ONLY" | "ALLOWED_BY_OVERRIDE"
type PlanVerdict    = "SIGNABLE" | "INCOMPLETE" | "BLOCKED"
type OutcomeVerdict = "IMPROVED" | "DECLINED" | "NO_DETECTABLE_CHANGE" | "NOT_YET_KNOWABLE" | "CONFOUNDED"
interface Reason { rule: RuleId; page: number; quote: string; plain: string; instead?: MeasureId[] }
```

Every verdict carries `reasons: Reason[]`. A verdict with no reason is a type error. Make the type impossible to
construct without one.

**P2.1 `diagnose.ts`**: `(checkups, fieldReadings, items) → Record<StressorId, {status, evidence[], settleWith?}>`.
`settleWith` names the item or reading that would move `SUSPECTED`/`NOT_ASSESSED` to `CONFIRMED`. Accepted proposer
suggestions enter only as `evidence` with `source: "accepted-proposal"` and `strength: "suggest"`.

**P2.2 `prescribe.ts`**: `(diagnosis, plan, overrides) → per-measure verdict + plan verdict`. Implements R1–R6 from
`rules.json`, with no hard-coded page numbers in code. Order of evaluation: R2 (barrier promotion) → R1 → R3 → R4 →
R5 → R6. `instead` is populated for R1 (the L1 measures that address the unaddressed first-line stressor) and R3.
Overrides: `{measureId, rule, reason (≥20 chars), approver}`. They flip the verdict to `ALLOWED_BY_OVERRIDE` and are
kept in the plan's ledger.

**P2.3 `followup.ts`**: `(plan, reaches) → schedule`. For each measure, choose indicators from
`citizenMonitorable`. Pick the control reach (user-chosen, else nearest upstream in the scenario). Compute
`knowableFrom = implementationDate + lag`, with lag from `responseLag`/`establishmentYears` (R7). Emit the check-up
calendar: ≥3 per BACI cell. If no control reach exists, emit a before-after design with a doubled baseline and set
`design: "BA"`, which the verdict reports (R8).

**P2.4 `verdict.ts`**: BACI contrast per indicator:
`Δ = (Ī_after − Ī_before) − (C̄_after − C̄_before)`, sign-adjusted so positive means better.
Seeded bootstrap (`prng.ts`, mulberry32, seed = hash of plan id), 2,000 resamples within cells, 90% percentile CI.
The meaningful change `δ` is a declared parameter per indicator (default 1 class unit) and is **shown in the UI**.
- `NOT_YET_KNOWABLE` if today < `knowableFrom` or any cell has n < 3. It returns `visitsNeeded` per cell and the
  date.
- `CONFOUNDED` if |C̄_after − C̄_before| ≥ δ and the CI spans 0.
- `IMPROVED` if CI low > 0. `DECLINED` if CI high < 0.
- `NO_DETECTABLE_CHANGE` if the CI lies inside (−δ, +δ). Otherwise the CI is too wide, so return
  `NOT_YET_KNOWABLE` with `visitsNeeded = ceil(n·(halfWidth/(δ/2))² − n)` per cell.

**P2.5 `fhir.ts`**: see P3.

**P2.9 `controls.test.ts`**: the positive and negative controls. **Each must fail when its rule is disabled.**
Implement a `disableRule` test hook and assert that the verdict changes (mutation check).
- Emscher casebook plan (sewer separation 4.2.2 before renaturalisation) → no `CONTRAINDICATED`.
- Planted naive plan: re-meandering 4.3.3 with S01 `CONFIRMED` and no L1 measure → `CONTRAINDICATED`, rule R1,
  `instead` contains 4.2.2.
- Invasive control (4.5.1) alone with S01 confirmed → `SYMPTOM_ONLY`.
- A compensatory measure with no infeasibility recorded → `DEFERRED`.
- BACI fixtures: planted +2 effect, n = 6/cell → `IMPROVED`; zero effect, n = 30/cell → `NO_DETECTABLE_CHANGE`;
  control shifts +2 → `CONFOUNDED`; n = 2 in one cell → `NOT_YET_KNOWABLE` with `visitsNeeded ≥ 1`.
- Determinism: the same plan run twice gives byte-identical output.
- **LLM-cannot-own-verdict:** feed the engine a diagnosis where every input is an accepted proposal. No stressor may
  reach `CONFIRMED`.
- Every casebook plan runs without throwing, and every verdict has ≥1 reason whose `page` exists in the page map.

**Done when:** `npm test` is green, coverage on `engine/` is ≥90% lines, and every control fails under its mutation.

---

## P3 · FHIR export (⟂ subagent, after P2 types) — Oct 1

Bundle type `collection`. Resources:

| Firstline object | FHIR R4 resource | Notes |
|---|---|---|
| Reach (impact, control) | `Location` | `position` lat/long, `physicalType` |
| Ecosystem subject | Per Q3: the OAH IG's own pattern. If none, a `Group` whose `characteristic` references the Location | **R4 constraint:** `Condition.subject`, `CarePlan.subject` and `Goal.subject` accept Patient/Group, not Location. `Observation.subject` does accept Location. Record which pattern was chosen and why in DECISIONS |
| Stressor | `Condition` | `code` from a local CodeSystem `firstline-stressor` (12 codes, D2.4 §3); `verificationStatus` confirmed / provisional (= SUSPECTED); NOT_ASSESSED stressors are *not* emitted and are listed in `CarePlan.note` |
| Refusal | `DetectedIssue` | `code` = rule id, `detail` = plain reason + D2.4 page, `implicated` → the CarePlan activity, `mitigation` = override (if any) with author and reason |
| Plan | `CarePlan` | `activity[].detail.code` = measure id (local CodeSystem `firstline-measure`), `status`, `scheduledPeriod` |
| SMART objective | `Goal` | `target.measure` = indicator, `target.detail`, `target.dueDate` = knowableFrom |
| Check-up | `Observation` | subject = Location; `meta.tag` provenance=scenario where applicable |
| Outcome | `Observation` (category `survey`, code `firstline-outcome`) | valueCodeableConcept = verdict; component = Δ, CI low/high, n per cell |

- Set `meta.profile` wherever an OAH IG profile matches (Q3).
- Validate: the HL7 validator jar if Java exists (`java -jar validator_cli.jar bundle.json -version 4.0.1`),
  otherwise the R4 JSON schema. Commit the validator output to `evidence/fhir-validation.txt`.
- **Done when:** the scenario plan exports a bundle that validates with 0 errors, and a test round-trips a plan to
  a bundle and back to the same ids and codes.

---

## P4 · The proposer (⟂ subagent; OpenRouter + google/gemini-2.5-flash) — Oct 1

- `app/api/propose/route.ts`: input is a citizen free-text note. Output (tool schema) is
  `[{stressor, quote, confidence}]` plus an optional plain-language plan summary.
- **Quote check (deterministic, server-side):** every `quote` must be a verbatim substring of the note, after
  whitespace normalisation. Proposals that fail are dropped and counted, and the UI shows *"1 proposal dropped: quote
  not found in note"*. That is the anti-hallucination proof on screen.
- Summaries are drafted only from engine output. The prompt receives the engine's verdicts and reasons and may
  rephrase, never decide. A test asserts that the summary route's input contains the engine JSON and no raw notes.
- **Cache seam:** `data/scenario/proposals.cache.json` holds prewarmed responses for the demo notes. When served,
  the UI badge reads **"Cached result · no new model call"**. With no API key, the proposer panel reads
  *"Proposer offline. The engine does not need it."* and the app still works.
- **Done when:** the demo runs identically with the key unset, the live path works with it set, and the quote-check
  test drops a planted fabricated quote.

---

## P5 · UI LOOP 1: DIVERGE (3 directions, sketches) — Oct 1

Loops follow `anti-slop-ui` → `references/score-loop.md`. Load `anti-slop-ui` and `masayume-ui-craft` now.

**The one screen every direction must render:** the **Stream Chart** for the scenario reach. It shows the
diagnosis (12 stressors, three states), the **Ladder** with one refusal on it, and the **BACI Cross** with a
`NOT_YET_KNOWABLE` verdict. Use real engine output, exported to `ui-loops/fixture.json`. Static HTML + one
`tokens.css` per direction, in `ui-loops/l1/<direction>/`.

**Fixed across all three** (owner taste; not up for divergence):
flat surfaces, no glass, no violet, no gradient; **one rationed accent, mint-teal, OKLCH hue ≈168**, on <5% of the
viewport; ≤3 type families; tabular figures on every number; the scenario label is visible.

**Varied across the three** (structure, not colour swaps; each derived from *this* subject):

| | Direction | Vocabulary source | Macrostructure · nav · footer | Ground |
|---|---|---|---|---|
| **D1** | **Survey Sheet** | The OAH standardised field form: ruled entry grids, form-field labels, tick boxes, site header block | 14 Narrative Workflow (Diagnose → Prescribe → Follow up as three numbered form sections) · N1a · Ft4 | light, cool paper |
| **D2** | **Long Section** | Hydrographic / engineering drawing: the reach as a longitudinal profile across the top, the Ladder as a stratigraphic column, dimension-line annotations for citations | 19 Map / Diagram · N3 side rail · Ft2 | dark, flat deep blue-black (the owner's SIGNAL DECK ground) |
| **D3** | **Formulary** | A pharmacopoeia monograph: running heads, two-column dense reference setting, boxed contraindications, "Indications / Contraindications / Monitoring" sections per measure | 02 Long Document · N9 · Ft4 | light, warm-neutral |

**Signature artifacts, required in every direction:** (1) **the Ladder**, the hierarchy with measures on rungs and
the refused measure hanging off its rung with its citation; (2) **the BACI Cross**, a 2×2 of Before/After ×
Control/Impact with the interaction drawn as the contrast, CI whisker, δ band, and n per cell; (3) **the
citation chip** `D2.4 · p.19`, which opens the verbatim quote.
**Banned in all three:** terminal/CRT/neon grammar, phosphor glow, all-caps micro-label everywhere, a stat as hero,
card-in-card, 3-equal-column feature grids, emoji icons, re-drawn phone or browser chrome.

**Score every direction** (see score-loop.md):
1. `node ~/.claude/skills/anti-slop-ui/scripts/ui-score.mjs ui-loops/l1/<dir> --round 1 --label <dir> --out ui-loops/l1/scores`
   gives the machine score, auto-fail tells and control report. `CONTROL_FAILED` means rerun; never use that score.
2. **Fresh-eyes critic:** one subagent that did not build any of them receives *only* the three 1280×800 and
   375×812 screenshots, anonymised as A/B/C. It scores the six axes (Philosophy, Hierarchy, Execution,
   Specificity, Restraint, Variety) 1–5 and answers: *"which one would a freshwater ecologist trust in 10
   seconds, and why?"*
3. **Composite** = machine score (must be ≥80 with 0 auto-fails to qualify) + the critic's axes. The winner is the
   highest composite. **Post a contact sheet** (3 screenshots + scores) to the owner. He may override the pick;
   otherwise proceed.

**Done when:** `ui-loops/l1/SCORE-LOOP.md` names the winner with both scores and the rejected directions' reasons.

---

## P6 · UI LOOP 2: COMMIT (full app in the chosen direction) — Oct 1 PM → Oct 2

Port the winner's tokens into `styles/tokens.css` (4-tier cascade per `masayume-ui-craft`: primitive → semantic →
component → state) and build every route.

| Route | Purpose | The one action |
|---|---|---|
| `/` | **Stream Chart**, scenario reach loaded; a cold visitor lands on the product, not a marketing hero | Drag a measure onto the Ladder |
| `/new` | **Build your own stream**, the unscripted judge path: tick evidence, paste a citizen note (proposer), drag any of the 43 measures | Get a verdict for anything you try |
| `/casebook` | D2.4 case studies replayed through the engine, rung by rung, with cites (positive-control surface) | Step through the Emscher sequence |
| `/plan/export` | Approve and sign (approver name, override reasons), view and download the FHIR bundle | Sign the plan |
| `/method` | The 8 rules with verbatim quotes and pages, the verdict vocabulary, what the LLM may and may not do, the scenario-data disclosure | Read any rule's source |

**Honest states, all designed, none left default:** empty stream (next action shown), proposer offline, proposer
cached, a quote dropped, an override pending, a plan INCOMPLETE (which stressor is uncovered), NOT_YET_KNOWABLE
(date + visits), CONFOUNDED (which reach moved).
**Every interactive element ships 8 states:** default, hover, focus-visible, active, disabled, loading, error,
success. Dragging must have a keyboard equivalent (select measure → "Place on ladder").
**Motion:** ≤3 primitives. (1) Ladder placement: transform only, 180ms. (2) Refusal stamp: opacity + 2px
translate, 120ms, no bounce. (3) BACI whisker grow on verdict. All behind reduced-motion, which uses a 120ms opacity
crossfade.

**Loop 2 gate:** run `ui-score.mjs` on **every route** at the three viewports, plus the critic subagent on fresh
screenshots, plus the e2e journeys (P8). Every route ≥88 with 0 auto-fails; every critic axis ≥4. Write the fix
list to `ui-loops/l2/SCORE-LOOP.md`, then fix it.

---

## P7 · UI LOOP 3: REFINE (measured deltas only) — Oct 2 → Oct 3

- Take only the loop-2 fix list plus the critic's lowest axis. No new features, no restyle.
- **Guarded terms may not drop** round-over-round: contrast, focus, disabled, LCP (the scorer prints them).
- Re-check the gains that loop 2 won, because a late fix can regress mobile. Sweep 320 / 375 / 414 / 768 / 1280×800.
- Contrast table for every foreground/background pair, written out as ratios. Use **ΔE** (not ratio) to prove that
  the five verdict colours are mutually distinct (≥20 ΔE76 each pair). Use **chroma** (not ratio) to prove that
  NOT_YET_KNOWABLE is the quietest verdict.
- **Stop rule:** when the composite moves <0.2 between rounds, write the plateau and its reason in
  `ui-loops/l3/SCORE-LOOP.md` and stop. Do not open a fourth loop. Three loops is the contract.
- **Done when:** every route ≥92, 0 auto-fails, all critic axes ≥4 (with one allowed at 3 only with a written
  reason), and the plateau is recorded.

---

## P8 · Hardening and verification — Oct 3

Load `product-hardening`. The gates are ordered, and nothing is promoted between them: unit tests → fixture
journeys in a real browser → live-model journeys → blocked.

`e2e/journeys.mjs` (zero-dependency CDP over Node 24's built-in `fetch`/`WebSocket`; Chrome at
`C:\Program Files\Google\Chrome\Application\chrome.exe`, `--headless=new --remote-debugging-port=9333`). Each
journey asserts the app's own state words, not DOM guesses, and each has a planted failure that must turn it red
once:
1. **Cold judge:** `/` → place 4.3.3 → a `CONTRAINDICATED` stamp with `D2.4 · p.19` is visible and on screen
   (contrast measured).
2. **Unscripted:** `/new` → tick 3 random evidence items → place 5 random measures → every placement shows a
   verdict and a reason. Run 20 seeded random runs with zero dead ends and zero uncaught errors.
3. **Override:** sign blocked → add a reason of fewer than 20 chars → rejected → a valid reason → `SIGNABLE` →
   the export contains a `DetectedIssue.mitigation`.
4. **Proposer offline:** unset the key → the proposer panel shows the offline state and the chart still works.
5. **Casebook:** Emscher replays with zero refusals.
6. **Keyboard only:** journey 1 completes without a pointer.

Also:
- **Pre-submit grep:** `mock|fake|dummy|lorem|0x0000|picsum|example.com|TODO`. Justify or fix every hit.
- **Stale-server check:** before any screenshot, diff the asset hashes in the served HTML against `.next/` on disk.
  Kill by PID from `netstat -ano`, since `pkill -f "next start"` does not match on Windows.
- **Headless Chrome defaults to dark mode.** Assert both themes explicitly if the chosen direction ships both.
- **Lane re-check:** re-run the 5 sweep queries (ideation §1). If anyone entered the cell, add them to the
  README's landscape section honestly.

---

## P9 · Packaging (the last 20% of the calendar is reserved for this) — Oct 3 PM → Oct 4 AM

**README** (200–270 lines, in this order; every claim backed by `CLAIMS.md` with a reproduction command):
thesis (the pitch lines) → **why this only works on OneAquaHealth** (D2.4, Feio, the DSS sentence) → how it works
(the four-column diagram + the three roles) → live URL → **verify in 60 seconds** (`npm i && npm run verify`,
and which test is the Emscher control) → demo video → evidence (`evidence/`: FHIR validation, test output, UI
score reports) → **what this is not** → attribution (D2.4 CC-BY) → built for (Track 2 statement).

**Track statement: Track 2, Data-to-Insight.** Citizen-collected check-ups become the one insight a city lacks:
which measure, in what order, and whether it worked. Also touches Track 3 (the AI proposes and never judges) and
Track 7 (FHIR `CarePlan`/`DetectedIssue`).

**Video (3–5 min; target 3:40):**

| Time | Beat |
|---|---|
| 0:00–0:15 | The negation line on a black card: *"Restoration is not finished when it is built."* The D2.4 quote on missing success criteria, with its page |
| 0:15–0:45 | **The refusal.** Scenario reach, drag re-meandering, CONTRAINDICATED · R1 · D2.4 p.19, the bucket sentence, `instead` → 4.2.2 |
| 0:45–1:15 | **The casebook.** Emscher replayed rung by rung and accepted. *"The engine agrees with 30 years of practice."* |
| 1:15–2:00 | **The follow-up.** 18 months of check-ups, the BACI Cross, NOT YET KNOWABLE + visits needed. Toggle a planted control shift: CONFOUNDED |
| 2:00–2:40 | **Build your own.** Paste a citizen note, the proposer suggests with quotes, one fabricated quote gets dropped on screen. The human accepts |
| 2:40–3:10 | **Sign and export.** An override with a reason, the FHIR bundle, the validator's 0 errors |
| 3:10–3:40 | Who it is for, what it is not, the attribution. Close on the pitch lines |

Voice: first person singular, plain. Run `humanizer` on the script and the Devpost text. Never present a cached
proposal as live. The badge is on screen, so say so.

**Submission:** Devpost form. Keep the vocabulary *prepared ≠ submitted ≠ acknowledged*: "submitted" is only
written down after the Devpost confirmation (id + timestamp with timezone) exists.

---

## 10 · Schedule (PDT)

| When | Phase | Exit gate |
|---|---|---|
| Sep 30 AM | P0 foundation + Q1–Q3 | repo public, verify green, Q branches logged |
| Sep 30 | P1 catalogue encoding | cites verified, positive control fails |
| Sep 30 PM → Oct 1 | P2 engine ⟂ P3 FHIR ⟂ P4 proposer | controls fail under mutation; bundle validates |
| Oct 1 | P5 UI loop 1 | winner named, contact sheet posted |
| **Oct 1 18:00** | **Fallback switch point** | engine + Ladder rendering end-to-end, or cut the BACI screen to static |
| Oct 1 PM → Oct 2 | P6 UI loop 2 | every route ≥88, critic ≥4 |
| Oct 2 → Oct 3 | P7 UI loop 3 | ≥92, plateau recorded |
| Oct 3 | P8 hardening | 6 journeys green, each red once under its planted failure |
| Oct 3 PM → Oct 4 AM | P9 packaging | README, video, Devpost text |
| **Oct 4 09:00** | **Freeze** | no code after this line |
| Oct 4 ≤ 18:00 | Submit | acknowledgement artifact saved |

## Cut order (if time runs short, cut from the top)

1. `/method` page (fold into README)
2. HL7 validator jar (keep JSON-schema validation)
3. Live proposer (keep the cached path, disclosed)
4. `/casebook` beyond Emscher + one other
5. D1/D3 sketches in loop 1 reduced to one screen each at lower fidelity (never skip the loop itself)

**Never cut:** the refusal with its cite, the NOT_YET_KNOWABLE state, the scenario label, the engine controls,
the three UI loops.

## Known gaps (carry into README)

- No public before/after citizen dataset exists; the follow-up runs on labelled scenario data.
- Stressor→first-line mapping and measure→stressor mappings are our reading of D2.4, reviewed once and logged, but
  not validated by the authors.
- BACI on ordinal citizen classes with small n is low-powered, and the tool reports that rather than hiding it.
- Not tested on a real phone unless one is available (emulation is not a device).
