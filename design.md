# Design — Firstline

A locked design system for this app. Every page redesign reads this file before emitting code. Extend or
amend it when the system needs to grow; do not regenerate per page. (Hallmark multi-page redesign, 2026-09-30,
replacing the dark "Long Section" D2 direction.)

## Subject

Firstline turns the OneAquaHealth D2.4 catalogue into a planner that refuses out-of-order restoration measures
and writes a before/after, control/impact verdict. Audience: river-restoration planners and the IEEE
hackathon judges who stand in for them. The one job: build a plan the catalogue accepts, and see why.

The vocabulary comes from the two documents this work actually lives in: a **river survey drawing** (long
section, hatched bed, metre scale, reach points) and a **technical deliverable** (numbered clauses such as
4.2.2, page citations, tabular annexes). Not a dashboard, not a terminal.

## Genre
Modern-minimal, custom-tuned (tuned depth: custom palette + fonts on Hallmark structures).

## Macrostructure family
- App pages (`/`, `/new`): **14 Narrative Workflow**. Diagnose, Prescribe, Follow up really are ordered
  stages, so their numerals are information.
- Evidence pages (`/casebook`, `/plan/export`): **15 Split Studio**. The work on the left, the proof (case
  replay, FHIR bundle) on the right. Collapses to one column under 64rem.
- Content page (`/method`): **02 Long Document**. Continuous reading column, inline section heads.
- Nav: **N1b**, reduced: wordmark left, five links, no dropdowns, always solid, no CTA slot (the primary
  action lives in the page). Footer: **Ft5 Statement**, one sentence, 50ch.

## Theme (OKLCH, all in `styles/tokens.css`)
| Token | Value | Role |
|---|---|---|
| `--color-paper` | oklch(97.6% 0.006 225) | drafting-film white, cool (not cream) |
| `--color-paper-2` | oklch(94.6% 0.009 225) | sunk rows, table stripe, fields |
| `--color-paper-3` | oklch(91.5% 0.012 228) | hover |
| `--color-rule` | oklch(86% 0.014 230) | hairlines |
| `--color-rule-strong` | oklch(62% 0.025 240) | control borders |
| `--color-ink` | oklch(24% 0.035 252) | river-navy ink, body and headings |
| `--color-ink-2` | oklch(40% 0.03 248) | secondary text |
| `--color-ink-3` | oklch(43% 0.028 246) | tertiary text, ≥6:1 on paper |
| `--color-accent` | oklch(46% 0.14 248) | hydrographic blue: primary action, water, focus |
| `--color-accent-ink` | oklch(98.5% 0.004 248) | text on accent |
| `--color-accent-wash` | oklch(93.5% 0.03 245) | pressed toggle, water fill |

Accent is rationed: the primary button, the water in the section drawing, the focus ring, the live
drop target. Verdict marks carry their own hues (amber, olive, red, green, grey, magenta) and never
borrow the accent. NOT_YET_KNOWABLE is the lowest-chroma mark on purpose.

## Typography
- Display: **Archivo**, width 87 (semi-condensed), weight 650, roman only. Self-hosted variable woff2.
- Body: **Public Sans**, 400 / 600, tabular lining figures everywhere. Self-hosted variable woff2.
- Code (JSON only): the system `ui-monospace` stack. No monospace data labels anywhere else.
- Scale anchor: `--text-display` clamp(2.5rem, 1.6rem + 3vw, 3.75rem). Sentence case; no all-caps labels.

## Spacing
4-point named scale in `tokens.css` (`--space-3xs` … `--space-3xl`). Pages use named tokens only.

## Motion
Framer Motion only. One motion per action: a placed measure settles into its line (180 ms), a refusal
stamp lands (120 ms). No scroll reveals. Reduced motion: opacity only, ≤150 ms.

## Microinteractions stance
Silent success (status line, no toasts). Citation popovers: 500 ms hover delay, 0 ms on focus, Escape
closes. Disabled = dashed border + struck label + ink-3 + not-allowed cursor + 0.72 opacity: four channels, never opacity alone.

## CTA voice
- Primary: accent fill, accent-ink label, 2px radius, 44px min height, verb-first ("Sign the plan").
- Secondary: 1px ink outline on paper, same geometry.
- Toggle (aria-pressed): accent-wash fill, accent border, 600 weight.

## What pages MUST share
Wordmark, accent and its ration, Archivo + Public Sans, CTA geometry, the section-head pattern
(numeral + display heading on one baseline, only where the content is a sequence), the quiet
citation reference `D2.4 p.19` (underlined text, never a boxed chip).

## What pages MAY differ on
Macrostructure within the family above. No enrichment on app pages: the section drawing is the one
authored figure and it is data, not decoration.
