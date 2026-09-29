# DECISIONS

Build-window decisions and measured evidence, newest first. Prepend every entry. Never edit an old one; correct it
with a new entry. Every bullet: the measurement, the rejected alternative, the file or test that pins it.

## 2026-09-29 (P2 engine: ambiguities resolved)

- **Reading rules are keyed by rule id.** `Checkup.readings` is `Record<string, number>` and `ReadingRule` has no
  separate key, so `readings[rule.id]` is the value tested. A missing key adds nothing. Pinned by `diagnose.test.ts`.
- **A compensatory (C-*) measure covers a stressor only if its line is listed in `r1AddressedBy` for that stressor
  AND it has a valid infeasibility.** The list gates first; infeasibility is an additional condition, not a bypass.
  With the default `['L1']` a C-* measure never covers. Rejected: infeasibility alone covering.
- **R5 still applies to an ALLOWED_BY_OVERRIDE measure.** An overridden L2 measure does not cover the uncovered
  stressor, so the plan is INCOMPLETE (not BLOCKED, not SIGNABLE). `overridden` records the override.
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
