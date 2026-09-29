# Independent review: D2.4 encoding (measures, casebook, stressors, checkup items)

Reviewer: fresh-eyes pass against `data/d24/_review/pages/<printed>.txt` and Field Sampling Protocols (Zenodo 20344421, pdftotext). Page numbers are printed pages. Disagreements only.

## Disagreements

| # | file | id | current | proposed | evidence (page, verbatim) | severity |
|---|---|---|---|---|---|---|
| 1 | measures.json + rules.json | S03 (firstLine=true) / all L1 measures | No L1 measure lists S03; `r1AddressedBy.default=["L1"]` | Add S03 to 4.2.2 (and/or 4.1.x), or set `r1AddressedBy.S03` to include a line that has S03 measures. Otherwise a CONFIRMED S03 (e.g. via ci-outflows / ci-dry-areas) is `uncovered` forever, `instead` is empty, and every L2 measure is DEFERRED with no way out. engine/prescribe.ts:54-66,88 | p.42-43 (4.2.2): "Selective blocking or reconfiguration of artificial drainage ditches and secondary collectors to slow drainage ... support groundwater recharge and baseflow"; "reducing rapid runoff during storm events". p.19: "particularly those associated with altered surface runoff pathways" | blocks-demo |
| 2 | measures.json | 4.2.2 | addresses [S01] | [S01, S03] | p.42: "excessive drainage accelerates runoff, reduces water availability in soils and floodplains"; p.43: "Improves water retention and hydrological resilience ... reducing rapid runoff" | should-fix (same fix as #1) |
| 3 | stressors.json | S12 | firstLine=false | firstLine=true (or document the choice) | p.19: first line includes "Reduction of dominant physical pressures ... particularly those associated with altered surface runoff pathways and highly sealed urban surfaces"; S12 (p.30) = "high impervious surface cover". Note: no measure at all addresses S12, so setting true also needs an L1 mapping or it recreates #1 | should-fix |
| 4 | stressors.json | S10 | firstLine=false | Ambiguous; consider true | p.19: first line secures "minimum ecological conditions (water quality, riparian function ...)"; S10 = low DO, high temperature (p.30). Only 4.2.1 addresses S10 | nit |
| 5 | measures.json | S12 (all measures) | no measure addresses S12 | Add S12 to 4.6.3, 4.6.5, 4.6.1, 4.6.4, 4.6.6, 4.6.7 | p.101 (4.6.5): "redirects runoff from impervious surfaces ... reduces the volume and frequency of stormwater entering sewer systems"; p.99 4.6.3 replaces sealed pavement | should-fix |
| 6 | measures.json | 4.6.1, 4.6.3, 4.6.4, 4.6.5, 4.6.6, 4.6.7 (and 4.6.2) | [S03] | add S01 | p.97 4.6.1: "Removes nutrients, and hydrocarbons through filtration"; p.99 4.6.3: "Improves water quality by filtering sediments and hydrocarbons"; p.100 4.6.4: "Filters sediments, nutrients, and hydrocarbons"; p.101-102 4.6.5: "reducing pollutant loads"; p.103 4.6.6: "Reduce pollutant loads, especially nutrients, hydrocarbons, and heavy metals"; p.104 4.6.7: "pollutant trapping" | should-fix (compensatory, so only matters for R4 wording) |
| 7 | measures.json | 4.1.3 | [S07] | [S07, S01] (+S04, S10 optional) | p.38: "restoration projects targeting the reduction of diffuse pollution"; "intercepting sediments, nutrients, hydrocarbons"; "lower water temperatures and improved dissolved oxygen"; "Improve bank stability" | should-fix |
| 8 | measures.json | 4.1.4 | [S07] | [] or [S06]; S07 not supported | p.39: "social reconnection is not an objective per se"; "preventing further encroachment, misuse, or surface sealing"; p.40: corridors "mask ongoing ecological degradation" | should-fix |
| 9 | measures.json | 4.3.3 | [S09] | [S09, S03, S08] | p.52: "improve flood mitigation"; "slows down runoff ... increases storage capacity"; "supports infiltration and ground water recharge"; "creates a variety of habitats" | should-fix |
| 10 | measures.json | 4.3.7 | [S04, S08] | + S09 | p.62 (vanes): "Fading of the linear channel and development of a meandering river"; app scenario "linear shape ... flashy flows" | nit |
| 11 | measures.json | 4.3.8 | [S05] | [S05, S08, S06] (+S03, S04) | p.66: "enhance lateral connections ... diversify flows (depth, substrate, and speed) and habitats, but also cap floods"; p.67 "Increase groundwater recharge and storage"; "restores dynamic geomorphological processes" | should-fix |
| 12 | measures.json | 4.3.4 | [S05] | + S08 | p.53: "Re-establishes riffle-pool dynamics, increasing habitat diversity" | nit |
| 13 | measures.json | 4.3.5, 4.3.6 | [S08] | 4.3.5 + S04 (+S05); 4.3.6 + S04 | p.54 "Re-establish vertical stability"; "replace concrete bed revetment"; p.55 "protect eroding streambanks by deflecting flow" | nit |
| 14 | measures.json | 4.3.17 | [S04] | [S04, S07] | p.80: "applied to recover riparian vegetation and habitat and enhance conditions for colonization of native plants"; p.81 "riparian restoration" | should-fix |
| 15 | measures.json | 4.3.11, 4.3.12, 4.3.14 | [S04] | + S07 | p.71: "Provide habitat and seed source to help re-establish native plants"; p.72 "Produce streamside habitat"; p.75 "creates new habitats" | nit |
| 16 | measures.json | 4.3.10 | [S04] | + S06 (S07) | p.69: "restores the connection between the channel and its floodplain"; "Facilitating riparian vegetation establishment" | nit |
| 17 | measures.json | 4.3.21 | [S03, S06] | + S08 (S07) | p.87: "Enhances habitat diversity ..."; "supports riparian vegetation" | nit |
| 18 | measures.json | 4.3.20 | slow, establishmentYears 3 | fast, no establishmentYears (not vegetated) | p.85-86: "short-term erosion control"; "Provide immediate physical protection"; "ECBs don't root or strengthen the soil themselves" | should-fix |
| 19 | measures.json | 4.1.1, 4.1.2, 4.1.3, 4.1.4 | establishmentYears 3 | Only bioengineered/newly restored banks per p.26 support 2-3 yrs; drop or change to a wider range for 4.1.1/4.1.2 (4.1.4 is planning) | p.26: "early establishment phase (typically the first 2-3 years), bio-engineered structures and newly restored banks"; p.33 "Regeneration may be slow"; p.75 "in 5 years the structure functions like a natural riparian zone" | should-fix |
| 20 | casebook.json | 5.1.4 | afterMonitoringReported: true | null (or "underway") | p.121: "is being scientifically monitored ... who are assessing sediment dynamics"; no results anywhere. Vaqueiros: no monitoring described. The record's own note contradicts `true` | should-fix |
| 21 | casebook.json | 5.1.5 | afterMonitoringReported: true | null / "operational statistic only" | p.122: "by November 2020, it had collected approximately 52,200 m³ of rainwater" (a usage figure, not monitoring) | nit |
| 22 | casebook.json | 5.1.2 | afterMonitoringReported: true | keep, but flag as "outcomes stated, no monitoring wording" | p.113: "Outcomes include ... an increase in invertebrate and bird species richness"; the word "monitoring" is absent | nit |
| 23 | casebook.json | 5.1.2 | no L3 measure | add 4.4.3 (and 4.4.2, 4.4.1) | p.113: "broad-based participation process ... cultural initiatives (e.g., Emscher Kunst), sports events and environmental education programmes ('blue classrooms')". D2.4's own cross-refs: 4.4.3 -> "5.1.1, 5.1.2, 5.1.3, 5.1.5" (p.92); 4.4.2 -> "5.1.2, 5.1.7" (p.91); 4.4.1 -> "5.1.1, 5.1.2, 5.1.3" (p.90) | should-fix |
| 24 | casebook.json | 5.1.2 unmapped | "the blocking of drainage ditches..."; "retention basin creation" unmapped | map to 4.2.2 and 4.6.7 | p.113: "blocking of drainage ditches to restore groundwater levels" vs p.43 4.2.2 "Selective blocking ... of artificial drainage ditches"; 4.6.7 title "Retention ponds and floodable parks" (tags 5.1.2, p.105) | should-fix |
| 25 | casebook.json | 5.1.1 | 4.3.11 for planting 213 trees/220 shrubs; retention area unmapped; "lateral wetlands" unmapped | Prefer/add 4.1.2 or 4.1.3 for planting (text gives no bank/slope context); map retention area to 4.6.7/4.3.21; add 4.1.4 for "continuous green ecological corridor" | p.111: "planting of 213 trees and 220 shrubs"; "re-establishment of lateral wetlands (lateral connectivity)"; "continuous green ecological corridor". D2.4 tags 4.1.3 -> 5.1.1 (p.38), 4.1.4 -> 5.1.1, 5.1.6 (p.40), 4.6.7 -> 5.1.1 (p.105). (4.3.11 is also tagged 5.1.1, p.71, so the current mapping is defensible.) | nit |
| 26 | casebook.json | 5.1.6 | 4.3.4 only for concrete removal | add 4.3.8 (banks) | p.124: "the concrete-lined channel was dismantled"; p.67 tags 4.3.8 -> "5.1.1, 5.1.2, 5.1.3, 5.1.6". Also 4.3.6 (boulders, tagged 5.1.6 p.56) and 4.6.7-type park absent | nit |
| 27 | casebook.json | 5.1.1 | S02 stressorEvidence quote | quote is the measure ("By removing impoundments"), not a reported stressor | p.111 | nit |
| 28 | casebook.json | 5.1.3 | stressorsReported [S05, S02] | + S08 (and S04/S06) | p.115: "simplified morphology, reduced lateral connectivity and habitat diversity" | nit |
| 29 | casebook.json | 5.1.4 | stressorsReported | + S11 (fish declines) | p.117: "populations of several native fish species ... have declined" | nit |
| 30 | checkup-items.json | ci-dry-areas | "D" present/extensive -> S03 (suggest) | Weaken or drop; intermittent flow is natural in many (Mediterranean) streams. Source page is p.12 (Flow types row precedes the p.13 header), not p.13 | FSP: Flow types row sits before the "Field Sampling Protocols 13" running head | should-fix |
| 31 | checkup-items.json | ci-artificial-structures | item text omits the qualifier | Restore "up to 10m after the stream bank" in the item text (only in `source`) | FSP p.13: "occupying the stream banks, or margins - up to 10m after the stream bank (specify, e.g. banks, street lights, sidewalks ...)" | nit |
| 32 | checkup-items.json | ci-outflows | 2 or more -> S03 only | Also plausibly S01 (stormwater/CSO outfalls) | D2.4 p.45: "Downstream of stormwater outfalls, road crossings, or combined sewer overflows" | nit |
| 33 | checkup-items.json | ci-clarity | text includes "foamy" -> S01 via suspended solids | foam is not suspended solids; drop or split | source note cites D2.4 p.30 suspended solids | nit |
| 34 | checkup-items.json | ci-bank-erosion | "in places" -> S04 suggest | keep only "widespread", or mark "in places" as weaker | p.30 "bank erosion and instability" (no severity threshold) | nit |
| 35 | checkup-items.json | coverage | no items feed S08, S09, S11; S09 and S08 are citizenObservable=true | add items or set citizenObservable=false; FSP also has "Bridges" (D2.4 p.30 lists bridges under S02) and gabion GA (p.30 S05) unused | FSP p.13 form rows | nit |
| 36 | measures.json | 4.5.1 | L4 only | fine as L4, but p.94 says it "may function either as a first-line intervention (together with the riparian vegetation restoration)" | p.94 | nit |

## Severity counts

- blocks-demo: 1 (#1)
- should-fix: 15 (#2, 3, 5, 6, 7, 8, 9, 11, 14, 18, 19, 20, 23, 24, 30)
- nit: 20 (#4, 10, 12, 13, 15, 16, 17, 21, 22, 25, 26, 27, 28, 29, 31, 32, 33, 34, 35, 36)

## Confirmed OK (by count)

- 43/43 measures: `line` matches p.19-20 and the section headings (4.1/4.2 L1, 4.3 L2, 4.4 L3, 4.5 L4, 4.6 C-hydro, 4.7 C-chem).
- 43/43 measures: listed `addresses` entries checked against the measure's own text; 0 listed stressors were unsupported except 4.1.4/S07 (#8).
- 43/43 responseLag reviewed; none clearly wrong except 4.3.20 (#18). 4.2.2, 4.2.3, 4.7.x "fast" are defensible as post-completion response.
- establishmentYears: 3 for 4.3.11-4.3.19 is consistent with p.26 and p.75; 4.3.20 and 4.1.x flagged.
- Stressors: S01, S03, S07 firstLine=true confirmed against p.19; the other 9 differ only as in #3/#4.
- Casebook 7/7: every quoted snippet spot-checked exists on the cited printed page.
- Emscher order claim confirmed: p.113 "eliminating wastewater discharges through the construction of a new underground sewage infrastructure, followed by large-scale ecological restoration measures".
- Bièvre order confirmed: p.111 "The elimination of wastewater connections ... constituted the first and most critical phase"; "subsequently included the planting".
- Sourinho order confirmed: p.120-121 "Following the removal of the structure, restoration works ... the planting of native species". "text-sequenced" is used only where the text states sequence; other orders are honestly labelled mention-order.
- `baselineReported: null` confirmed for 7/7: no case reports pre-restoration baseline values (5.1.6 "30% within two years" and 5.1.2 richness increase give changes only).
- `afterMonitoringReported: true` confirmed with explicit wording for 5.1.1 (p.111 "post-project monitoring") and 5.1.6 (p.124 "Monitoring showed"). null confirmed for 5.1.3 and 5.1.7.
- checkup-items: 9/9 FSP-sourced item texts match the form labels verbatim (barriers, outflows, artificial structures, CC, AR, D, filamentous algae, trees, bushes, non-native); form pages 13-14 correct except ci-dry-areas (p.12). 4 Firstline-authored items are correctly labelled as not in the form; the D2.4 p.127 and p.42 citations check out.
