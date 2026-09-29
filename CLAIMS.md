# CLAIMS

Every claim the README or video makes must have a row here with a reproduction command. LIVE / NEXT / NOT LIVE.

| Claim | Status | Reproduce |
|---|---|---|
| Engine encodes D2.4 stressors, measures and rules with page cites | NEXT (P1) | `npm run verify:cites` |
| An out-of-order plan is refused with its D2.4 page | NEXT (P2) | `npm test` (controls) |
| Outcome verdict includes NOT_YET_KNOWABLE with visits needed | NEXT (P2) | `npm test` (controls) |
| The app runs with the model unplugged | NEXT (P4/P6) | unset `OPENROUTER_API_KEY`, `npm run dev` |
