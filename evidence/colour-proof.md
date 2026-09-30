# Colour proof

Source: styles/tokens.css primitives. Control: #101010 on #111111 = 1.01:1 (must be ~1.0, proves the instrument can see "no contrast").

## Text pairs, WCAG contrast (body text needs 4.5:1)

| foreground | background | fg | bg | ratio | result |
|---|---|---|---|---|---|
| ink | paper | #dfeaf0 | #0f1215 | 15.36:1 | pass |
| ink | sheet | #dfeaf0 | #191c1f | 13.99:1 | pass |
| ink | sheet-2 | #dfeaf0 | #25282c | 12.10:1 | pass |
| ink-2 | paper | #b3c0ca | #0f1215 | 10.12:1 | pass |
| ink-2 | sheet | #b3c0ca | #191c1f | 9.22:1 | pass |
| ink-2 | sheet-2 | #b3c0ca | #25282c | 7.97:1 | pass |
| ink-3 | paper | #97a7b4 | #0f1215 | 7.61:1 | pass |
| ink-3 | sheet | #97a7b4 | #191c1f | 6.93:1 | pass |
| ink-3 | sheet-2 | #97a7b4 | #25282c | 5.99:1 | pass |
| accent-ink | accent | #001910 | #57d1a8 | 9.67:1 | pass |
| accent-deep | sheet | #74dfb9 | #191c1f | 10.59:1 | pass |
| accent-deep | paper | #74dfb9 | #0f1215 | 11.63:1 | pass |
| accent-deep | sheet-2 | #74dfb9 | #25282c | 9.16:1 | pass |
| ink | wash-contra | #dfeaf0 | #3e1513 | 12.99:1 | pass |
| ink-2 | wash-contra | #b3c0ca | #3e1513 | 8.56:1 | pass |
| mark-contra | wash-contra | #ff726b | #3e1513 | 5.96:1 | pass |
| mark-contra | sheet | #ff726b | #191c1f | 6.41:1 | pass |
| mark-contra | paper | #ff726b | #0f1215 | 7.04:1 | pass |
| ink | accent-wash | #dfeaf0 | #133529 | 10.94:1 | pass |

## Non-text, WCAG 1.4.11 (3:1). Every verdict mark also carries a shape and a word, so a mark below 3:1 is not load-bearing.

| mark | against | ratio | result |
|---|---|---|---|
| focus | paper | 11.63:1 | pass |
| focus | sheet | 10.59:1 | pass |
| focus | sheet-2 | 9.16:1 | pass |
| rule-strong | paper | 5.82:1 | pass |
| rule-strong | sheet | 5.30:1 | pass |
| rule-strong | sheet-2 | 4.59:1 | pass |
| mark-confirmed | sheet | 7.20:1 | pass |
| mark-suspected | sheet | 11.98:1 | pass |
| mark-notassessed | sheet | 6.02:1 | pass |
| mark-contra | sheet | 6.41:1 | pass |
| mark-improved | sheet | 9.04:1 | pass |
| mark-nyk | sheet | 2.74:1 | below 3:1, carries shape and word |
| mark-confounded | sheet | 6.43:1 | pass |

## Verdict marks are mutually distinct: CIE Lab dE76 for every pair (requirement: >= 20)

| pair | dE76 | result |
|---|---|---|
| confirmed / suspected | 36.5 | pass |
| confirmed / notassessed | 77.3 | pass |
| confirmed / contra | 38.2 | pass |
| confirmed / improved | 82.5 | pass |
| confirmed / nyk | 69.5 | pass |
| confirmed / confounded | 99.3 | pass |
| suspected / notassessed | 77.7 | pass |
| suspected / contra | 70.2 | pass |
| suspected / improved | 62.1 | pass |
| suspected / nyk | 77.3 | pass |
| suspected / confounded | 101.8 | pass |
| notassessed / contra | 75.3 | pass |
| notassessed / improved | 46.5 | pass |
| notassessed / nyk | 26.1 | pass |
| notassessed / confounded | 26.0 | pass |
| contra / improved | 99.7 | pass |
| contra / nyk | 67.8 | pass |
| contra / confounded | 89.4 | pass |
| improved / nyk | 57.3 | pass |
| improved / confounded | 66.7 | pass |
| nyk / confounded | 44.6 | pass |

Minimum dE76 across all 21 pairs: **26.0**.

## NOT_YET_KNOWABLE is the quietest verdict: Lab chroma C* (quietest first)

nyk 2.9 < notassessed 16.3 < confounded 40.1 < improved 45.0 < suspected 59.8 < confirmed 60.8 < contra 61.3

Quietest: **nyk** (pass); the next quietest is 5.6x louder in chroma.

RESULT: PASS
