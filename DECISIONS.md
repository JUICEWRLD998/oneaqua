# DECISIONS

Build-window decisions and measured evidence, newest first. Prepend every entry. Never edit an old one; correct it
with a new entry. Every bullet: the measurement, the rejected alternative, the file or test that pins it.

## 2026-09-29 (P1 independent review applied)

- **A fresh reviewer (not the encoder) audited 43 measures, 7 casebook plans, 12 stressors and 14 items against the page text: 36 disagreements (1 blocks-demo, 15 should-fix, 20 nit).** Full table: evidence/review-d24.md. Confirmed OK: 43/43 lines, all Emscher/Bievre/Sourinho ordering quotes, baseline null in 7/7.
- **Blocks-demo #1 (S03 with no way out) was already fixed by the S03 non-gating decision below**; also added S03 to 4.2.2 (p.42-43 quotes).
- **Applied (quote-backed):** 4.1.4 addresses nothing (p.39 "social reconnection is not an objective per se") so it can never count as covering S07; S01/S12 added to compensatory 4.6.x; 4.1.3 +S01; 4.3.3 +S03,S08; 4.3.8 +S08,S06; 4.3.17 +S07; 4.3.20 (erosion blanket) is fast with no establishment period (p.85-86 "immediate physical protection"); establishmentYears kept only on 4.3.11-4.3.19 (p.26 speaks of bio-engineered structures, not riparian planting); casebook 5.1.4 and 5.1.5 afterMonitoring set to null with notes; Emscher gains 4.2.2 (drainage-ditch blocking), 4.6.7 (retention basin) and 4.4.3 (participation); ci-dry-areas no longer suggests S03 (intermittent flow is natural in many streams) and its source page is p.12.
- **Consequence measured:** 4.1.x now fall back to the slow lag class (1095 d), so the R7 date for 4.1.1 is unchanged (2028-12-31) but no longer asserts a p.26 establishment claim for riparian planting. rules.json still cites p.26 for the slow class: that is an approximation, stated here rather than hidden.
- **Not applied (nits, left in the review file):** S10/S12 first-line, extra stressor tags on 4.3.4-4.3.16, casebook 5.1.1/5.1.3/5.1.6 stressor extras, four item wording nits, items for S08/S09/S11. ci-dry-areas now carries no evidence, so it is an unscored context question.

## 2026-09-29 (P1/P2 integration: real-catalogue controls)

- **S03 (altered hydrology) is NOT a hard first-line gate; S01 and S07 are.** Measured: the real Emscher plan
  (sewer 4.2.2 then 4.3.x) drew CONTRAINDICATED verdicts on its 4.3.x measures because S03 was flagged first-line and no L1 measure
  addresses it. That refused the catalogue's own flagship case study. D2.4 p.19 says the physical-pressure group
  (runoff, sealed surfaces) is first-line only "where feasible", while water quality and riparian function are
  unconditional. Rejected: keeping S03 gating (contradicts the catalogue's own casebook); flagging S12 instead.
  Consequence: sealing/hydrology measures (4.6.x, 4.3.21) are never forced ahead of structural works. The UI must say
  so on the Method page. Pinned by real-catalogue.test.ts (Emscher control) and verify-catalogue-shape.mjs.
  Earlier entry in this file and implementation.md P1 list S03 as first-line; this entry supersedes them.
- **Rule verdict text corrected.** rules.json said R1 = DEFERRED and R4 = CONTRAINDICATED; the engine does the
  opposite (R1 contraindicates, R4 defers). Text now matches behaviour.
- **Casebook cases repeat a measure id** (Emscher/others mention 4.1.2 more than once). A plan holds each measure
  once, so the replay keeps the lowest order (pinned in the real-catalogue test).
- **Real-data controls all fire:** naive 4.3.3 with S01 confirmed -> CONTRAINDICATED R1 p.19 with instead containing 4.2.2; the same plan with R1 disabled is not contraindicated (mutation); 4.1.1 built 2026-01-01 is
  NOT_YET_KNOWABLE until 2028-12-31 (3 years, D2.4 p.26).

## 2026-09-29 (P2 engine: ambiguities resolved)

- **Reading rules are keyed by rule id.** `Checkup.readings` is `Record<string, number>` and `ReadingRule` has no
  separate key, so `readings[rule.id]` is the value tested. A missing key adds nothing. Pinned by `diagnose.test.ts`.
- **A compensatory (C-*) measure covers a stressor only if its line is listed in `r1AddressedBy` for that stressor
  AND it has a valid infeasibility.** The list gates first; infeasibility is an additional condition, not a bypass.
  With the default `['L1']` a C-* measure never covers. Rejected: infeasibility alone covering.
- ~~**R5 still applies to an ALLOWED_BY_OVERRIDE measure.** An overridden L2 measure does not cover the uncovered
  stressor, so the plan is INCOMPLETE (not BLOCKED, not SIGNABLE).~~ **Superseded 2026-09-30, see P6 below.** `overridden`
  still records the override.
- **Override matches the first valid entry for the measure; only `rule: 'R1'` overrides are read.** Invalid ones
  (reason under 20 chars after trim, blank approver, other rule/measure) are ignored, not errors.
- **R2 is evaluated before R1 and is exempt from it,** so a barrier measure is INDICATED even with S01 uncovered; the
  plan is then INCOMPLETE through R5 rather than BLOCKED.
- **Plan reasons.** BLOCKED lists each contraindicated measure's first reason. INCOMPLETE lists every R5/R6 hit.
  SIGNABLE carries one R1 reason. If R5 and R6 are both disabled and nothing blocks, the plan is SIGNABLE.
- **Bootstrap percentiles:** `low = sorted[floor(a*B)]`, `high = sorted[min(B-1, floor((1-a)*B))]`, `a=(1-ciLevel)/2`.
  Per resample the cells are drawn in the order beforeImpact, afterImpact, afterControl, beforeControl (one PRNG
  stream; BA skips the control draws). Seed = `hashString(planId|measureId|indicatorId) ^ seed`, coerced unsigned.
- **Before/after split** is by check-up date against `implementedOn` (`date < implementedOn` is before, so a check-up
  on the build day is "after"). Cells are built from check-ups sorted by (date, id), so input order never matters.
- **Unbuilt measure in `outcome`:** reason R7, `visitsNeeded` = the largest per-cell shortfall, no `knowableFrom`.
- **Decisive verdicts (IMPROVED, DECLINED, NO_DETECTABLE_CHANGE, CONFOUNDED, wide-interval NOT_YET_KNOWABLE) carry one
  R8 reason** stating the design; BA says "Before-after only, no control reach".
- **Disabled R8 still returns NOT_YET_KNOWABLE when a required cell is empty** (no mean exists), but relaxes 1..min-1.
- **Followup for an unbuilt measure:** existing check-ups all count as "before"; "after" needs the full minimum.
  `today` is accepted but unused (the schedule is date-independent). `knowableFrom` is computed even if R7 is disabled.
- **`R1a` must exist in `cat.rules`** because the override reason cites it.
- **Extra module:** `engine/cells.ts` (shared cell/lag helpers); `compareIso` added to `dates.ts`.

## 2026-09-29 (P1 catalogue encoding)

- **Page rule: cite the PRINTED number in the running head.** `pdftotext` gave 149 form-feed parts. 145 pages have a
  head `D2.4 Catalogue of measures … <n>` and become `data/d24/_review/pages/<n>.txt`; exactly one non-empty page has
  no head (PDF page 3, the title page) and is skipped, so it can never be cited. Measured offset: PDF page = printed
  page + 2 (printed 2 = PDF 4, printed 19 = PDF 21), but the script never uses the offset; it reads the head. Rejected: the
  PDF index as the page. Pinned by `scripts/extract-d24.mjs`; the verifier also checks each measure's `page` is
  where its numbered heading is printed, not the contents (`scripts/verify-d24-cites.mjs`).
- **Zenodo returns 403 to Node's default `fetch`.** `curl` works. The extractor sends a `curl/8.0` User-Agent.
  Rejected: shelling out to `curl` (keeps the script dependency-free and portable).
- **Verifier normalisation removes ALL whitespace, hyphens and dashes on both sides.** Rejected: only un-wrapping
  `-\n`, which cannot tell "socio-\neconomic" (a real hyphen) from a wrap hyphen. Cost: the check is blind to a
  quote that differs from the page only by a hyphen or a space. Ligatures are folded by NFKC; curly quotes, en/em
  dashes, bullets and zero-width characters are mapped. Pinned by the `--selftest` normaliser cases.
- **Planted control** `data/_controls/bad-cite.json` has four wrong cites (right text on the wrong page, invented
  text, an invented casebook `unmapped` string, a heading on the wrong page). `--controls` exits 1 with 4 misses;
  `--selftest` requires real data exit 0 AND controls non-zero, and `verify-data.mjs` runs it. A scan that
  checked nothing exits 3 (an empty scan is not a pass).
- **A quote may sit on a later page than the measure heading.** 31 of 43 `limitations` and 2 `objective`s are on
  the next page. Rather than cite the heading page falsely, a measure carries optional `limitationsPage` and
  `objectivePage`; the verifier checks each field against its own page. `Measure` in `engine/types.ts` has no such
  fields (extra JSON keys are harmless when the JSON is cast); the orchestrator may add them as optional.
- **`objective` = D2.4's own "what problem it addresses" sentence** (p.19 defines Objective that way), copied
  verbatim, at most 40 words (asserted by `verify-catalogue-shape.mjs`). D2.4 has no labelled "Objective" heading in
  §4, so this is a selection. `limitations` = one verbatim bullet from that measure's "Limitations" list (a
  judgement: the most decision-relevant one, usually the first). Every measure has a Limitations list, so none
  needed `"not stated in D2.4"`.
- **firstLine = S01, S03, S07 (interpretation).** D2.4 p.19 names three first-line groups: riparian vegetation
  (S07), water quality (S01), and "reduction of dominant physical pressures … altered surface runoff pathways and
  highly sealed urban surfaces" (read as S03). S12 (catchment pressures, "high impervious surface cover") was NOT
  marked first-line even though it overlaps the sealing wording: the sentence says pressures that undermine riparian
  function and water quality, and S03 is the stressor D2.4 §3 names for runoff. Rejected: S12 = first-line (would
  make every plan with sealed catchment BLOCKED, which D2.4 does not say).
- **Known tension surfaced, not hidden.** p.19 puts sealing reduction in the first line, but §4.6 files rain
  gardens, permeable pavements etc. under compensatory (C-hydro). Encoded by section (C-hydro); each 4.6.x carries
  `note`. `rules.params.r1AddressedBy.S03 = ["L1","C-hydro"]` lets a C-hydro measure count as addressing S03 for R1.
- **citizenObservable is a boolean, "partly" became true.** S01, S03, S04, S08, S11 are "partly" visible to a lay
  person and are `true`; only S10 (physico-chemistry needs a probe) and S12 (catchment GIS) are `false`.
- **`addresses` is read from each measure's own text; fewer when unsure.** Judgement calls a reviewer should check:
  4.1.4 -> S07 only (text is about corridors and connectedness, sealing only mentioned in passing); 4.2.2 -> S01
  only (its drainage-ditch paragraph also touches S03); 4.2.1 -> S01+S10 (self-purification, oxygenation);
  4.3.3 -> S09 only; 4.3.4 -> S05; 4.3.5 and 4.3.6 -> S08; 4.3.7 -> S04+S08 (its own first sentence names both);
  4.3.11-4.3.20 -> S04 only (their stated goal is erosion control; the riparian cover they produce is left to 4.1.x);
  4.3.21 -> S03+S06; 4.4.1-4.4.3 -> none (enabling or social; nothing is tackled directly); 4.5.1 -> S07+S11
  (invasive plants sit in both definitions); 4.6.x -> S03 only (p.97 says they "help preventing the flash floods";
  not S12 because D2.4 says they are not freshwater recovery); 4.7.x -> S01.
- **responseLag is our declaration.** D2.4 p.22 gives only an ordering (algae fast, fish moderate, riparian slow).
  Assigned: riparian and bioengineering (4.1.x, 4.3.11-20, 4.5.1, 4.4.1) slow; fish and geomorphology (4.3.1-10,
  4.3.21, 4.6.x) medium; water-quality measures (4.2.2, 4.2.3, 4.7.x) fast; 4.2.1 medium. Not D2.4 numbers.
- **establishmentYears = 3 on 14 measures** (4.1.1-4.1.4, 4.3.11-4.3.20): p.26 says "typically the first 2–3
  years" and we take the upper bound. 4.3.21 excluded (not vegetated works). R7 slow = 1095 days, cited to p.26.
- **R7 medium = 365 d and fast = 90 d are Firstline assumptions**, flagged `assumption: true` so the UI can say so.
  Rejected: presenting them as D2.4 values. minPerCell 3, bootstrapResamples 2000, ciLevel 0.9 are declared
  engine parameters, not D2.4 numbers.
- **Rule quotes.** R3 is cited to p.21 ("otherwise, invasives simply recolonize the restored sites.") because the
  sentence crosses p.20 to p.21 and a quote must sit on one page. R8 is cited to p.23 ("Without appropriate
  controls …") rather than the BACI sentence on p.22, as it states the consequence the verdict CONFOUNDED needs.
  R4 uses "options of last resort"; the sharper sentence "applied only when first-, second- and third-line
  measures are unfeasible" (p.21) is the alternative if the R4 reason should name the infeasibility gate.
- **Casebook encodes only what the case text says.** Mapping to a catalogue id happens only where the text names the
  technique (e.g. Kallang "live staking, brush layering, coir rolls, erosion control blankets" -> 4.3.12, 4.3.15,
  4.3.19, 4.3.20). Left `unmapped` (verbatim): Bièvre retention area and daylighting, Emscher wetland rewetting, retention
  basins, side channels, ditch blocking, soil remediation, La Marjal wetland basins, Kallang habitat features, Isar
  side channels. Bièvre riparian planting maps to 4.3.11 (text says "planting of 213 trees and 220 shrubs"); its
  "Riparian vegetation … restored" is not mapped to a 4.1.x because the text does not say passive or active.
  Every case has `baselineReported: null` with a `notStated` note: no case text reports pre-restoration data.
  Where the text reports outcomes without monitoring (Isar), `afterMonitoringReported` is `null`, not `true`.
- **Ordering is stated only where the text states it.** `orderBasis: "text-sequenced"` (Bièvre 4.2.2 "first and most
  critical phase", then "subsequently" planting; Emscher sewer "followed by" restoration; Sourinho works "Following
  the removal") versus `"mention-order"` (a list). Emscher: 4.2.2 order 1 and every 4.3.x after it, asserted in
  `verify-catalogue-shape.mjs` as the demo's positive control. Bièvre's re-meandering is mentioned before the
  wastewater sentence but is not text-sequenced, so it sits after.
- **Check-up items: the OAH citizen questionnaire was not found.** `hl7-eu/oah` (220 tree entries) has no
  Questionnaire under `input/fsh` or `input/resources`; only observation profiles and examples. Fell back to the
  Field Sampling Protocols Annex I form (Zenodo 20344421): 10 items use its own labels (barriers, other artificial
  structures, outflows, bank concrete, channel artificial substrate, dry areas, filamentous algae, riparian trees,
  bushes, non-native species). 4 items are Firstline-authored and labelled as such in `source` (litter, bank
  erosion, odour, clarity) because the field form has no lay-observable version of them. Odour is the least
  grounded. Every evidence row is `suggest`; none confirms. Two labels ("CC: concrete or similar artificial
  impervious materials", "Non-native species (?, 1, >1; species names)") sit in table cells that `pdftotext`
  interleaves with column glyphs, so they were checked by reading the raw text, not by machine.
- **Interpretive mappings in check-up items:** outflow pipes -> S03 (runoff delivery), filamentous algae "extensive"
  -> S01 (nutrient enrichment, from D2.4 p.42), riparian 0-20% cover -> S07, any non-native riparian species -> S07
  (D2.4 p.30 puts exotic-species invasion inside S07).
- **`reading-rules.json` is `[]`.** Read all of the Key Indicators factsheets (Zenodo 20345207) and Field Sampling
  Protocols for a threshold that confirms a stressor. None exists: the factsheets give methods and rationale, no
  cut-off; the only numbers are D2.4 design limits (velocity 0.6 m/s, slope 3%, invasive cover 15% / 50%, corridor
  30 m) and the form's own "extensive = more than 33%", none of which says a stressor is present. Rejected: turning
  any of those into a confirming rule. So no check-up item can confirm a stressor on its own.
- **Indicator sources.** Riparian cover, algae, flow/dry channel and barrier passability take their idea and scale
  from the field form; bank stability from D2.4 p.26; litter from D2.4 §4.2.3; odour and clarity are Firstline
  lay proxies with no D2.4 or OAH parameter behind them, and their `source` says so. `delta` = 1 class unit on every
  indicator is our declared parameter (source string says "not a D2.4 number").

## 2026-09-29 (P0 foundation)

- **LLM provider: OpenRouter, `google/gemini-2.5-flash`, plain `fetch`.** Owner decision. Rejected: the Anthropic
  SDK (the owner holds an OpenRouter key, not an Anthropic one, for the product). The proposer is the only LLM
  consumer and the app runs without it. Pinned by `.env.example` and `implementation.md` P4.
- **Stack: Next 15 App Router + TypeScript strict + Vitest, CSS Modules (no Tailwind), Framer Motion only.**
  Rejected: Tailwind (owner's standing preference against it).
- **Java is not installed** (`command -v java` empty), so the HL7 validator jar can't run. FHIR validation in P3
  falls back to a structural JSON check. Stated in the README's known gaps when P3 lands.
- **Deadline confirmed from the rules page: Oct 4 2026 21:00 PDT.** A third-party snippet said Oct 1; rules govern.
- **`engine/types.ts` is the contract.** `Verdicted<V>` makes a verdict without a reason a compile error
  (`reasons: [Reason, ...Reason[]]`).
- **Remote:** `origin` = `github.com/JUICEWRLD998/oneaqua`, empty at start (`git ls-remote` returned no refs).

## P3/P4 (2026-09-30)
- **ajv 8 was declared but ajv 6 was installed** (hoisted from eslint), so `tsc` failed on `validate-fhir.ts` while the script
  ran by luck. `npm install` fixed it; FHIR validation is structural (ajv 8 against the R4 schema), no Java, terminology and
  profiles are not checked.
- **Proposer order:** `PROPOSER_MODE=cached` or no key → cache (re-running the quote check on the stored raw text) else the
  offline message; key set → live, falling back to cache on provider failure. The cache can never launder a bad quote.
- **Cache holds raw model output verbatim**, plus one planted entry (`demo-vale-planted`) with a hand-added fabricated
  proposal, flagged `planted`, so the UI can show "1 proposal dropped: quote not found in note".
- **Known weakness, shown not hidden:** live Gemini proposed S01 for "Some litter caught in the reeds" (weak, arguably
  wrong). It is labelled "Proposed · not evidence", a human must accept it, and the engine treats an accepted proposal as
  `suggest`, never `confirm`. Evidence: `evidence/proposer-smoke.txt`.
- **Summaries see engine JSON only**; `note`/`notes` keys are stripped at any depth (tested).

## P6 (2026-09-30)
- **R1a override now makes a plan SIGNABLE (supersedes the 2026-09-29 R5 decision).** Found by e2e journey 3: with R5
  unwaived, an override could never reach SIGNABLE, because SIGNABLE needs every confirmed first-line stressor covered, and
  coverage is placement-based, so an L2 measure is only ever refused while coverage is incomplete. The override was vacuous and
  the plan spec (override then SIGNABLE, `DetectedIssue.mitigation` in the export) unreachable. Now a valid R1a override
  (>=20 chars, named approver) waives the two package-completeness hits (uncovered first-line stressors; single measure with
  2+ confirmed stressors). It never waives an empty plan or a missing SMART objective (R6). The plan's R1a reason names the
  stressors left open, and the FHIR export carries them as a DetectedIssue with the override as mitigation. Accountability, not
  approval of the science: the refusal itself is unchanged. Pinned by prescribe.test.ts (with controls).
- **`/` starts with an EMPTY ladder on the scenario diagnosis** (plan journey 1: place 4.3.3, be refused). The built plan is one
  click away via the presets (shows the follow-up).
- **`/new` has two observer sheets**, because one observer only SUSPECTS and two distinct observers CONFIRM (engine rule).
- **Single dark theme ships** (D2). Nothing to assert in a second theme.
