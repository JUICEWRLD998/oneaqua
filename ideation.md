# Firstline — ideation

> **Restoration is not finished when it is built.**
> **Treat the cause first · Prove it worked.**

Prepared 2026-09-29 by Mustapha Fadhlullah (independent security researcher) with Claude Opus 5.5. Selection pass
only: no code yet. Method: `fexx-idea-engine` (empty-cell sweep → negation → pitch → name → three-role shape) and
`hackathon-strategy` (viability gate → rubric → cliché list → judge attack). Build plan: `implementation.md`.

---

## 0 · The event (verified 2026-09-29, from the rules and overview pages, which govern)

| Fact | Value | Source |
|---|---|---|
| Event | OneAquaHealth IEEE Global Hackathon 2026 | oneaquahealth-ieee-hackathon.devpost.com |
| Deadline | **Oct 4, 2026 @ 21:00 PDT** (= Oct 5 04:00 UTC) | rules page. *A third-party search snippet still says "1 Oct 09:30 IST". That is the old date. Re-check the Devpost countdown on Sep 30.* |
| Eligibility | Individuals or teams, legal age, public repo, original work made during the event | rules page |
| Submission | Track alignment statement · description (problem/solution/impact) · **3–5 min demo video** · public GitHub repo · working prototype or mockup | overview page |
| Prizes | **Overall**, not per track: Winner $1,500 · 1st RU $1,000 · 2nd RU $500 · 2× Special Mention $250 | overview page |
| Field | 1,187 registered participants; **31 public repos** tagged `oneaquahealth` on GitHub | Devpost counter; GitHub search API |

**Rubric (1–10 per criterion, weighted):**

| Criterion | Weight |
|---|---|
| Impact & Alignment with the OneAquaHealth mission | **30** |
| Innovation & Creativity | 20 |
| Technical Implementation | 20 |
| Usability & User Experience | 15 |
| Feasibility & Scalability | 15 |

**Tracks:** 1 Citizen Science UX · 2 Data-to-Insight · 3 AI-Supported Assessment · 4 Awareness & Storytelling ·
5 Community & Gamification · 6 Resilience Informatics · 7 Digital Health Standards.

**Judges (10), and what each one will reward:**

| Judge | Affiliation | What lands with them |
|---|---|---|
| **Maria João Feio** | OneAquaHealth Program Coordinator (U. Coimbra) | **Co-author of D2.4, the Catalogue of Measures we build on.** Also co-author of the Key Indicators factsheets and the Field Sampling Protocols. She owns the 30% criterion in practice |
| Gora Datta | FHIR / IEEE | A real FHIR R4 bundle that goes beyond `Observation`: `Condition`, `CarePlan`, `Goal`, `DetectedIssue` |
| Harm op den Akker, Ângela Freitas | SHINE 2Europe (digital health) | A clinical workflow that a health person recognises on sight: diagnose → prescribe → contraindicate → follow up |
| Alexander Nikolov | SYNYO (citizen-science platforms) | Citizens doing work that science actually uses (the check-ups feed the verdict) |
| George Koutalieris | ENORA Innovation | Exploitation path: who deploys it next year |
| Pradyumna Kodgi, Vinay Sharma, Sreekanth Reddy Panyam, David E. González | IEEE / product (Oracle, Persistent) | One clear flow, visible logic, no hand-waving, it works when they poke it |

**Viability gate: PASS.**
Time: ~5 days. Runtime cost: one LLM key, and the app runs fully with the model unplugged. Credentials: none are
sponsor-issued. Data: CC-BY 4.0 consortium deliverables. Eligibility: open. Nothing is spent yet.
One open item: re-confirm the deadline on the Devpost page itself (owner: builder, by Sep 30 12:00).

---

## 1 · The field, and the empty cell

### Lane sweep, 2026-09-29, GitHub REST search API

```
Positive control   q=oneaquahealth                                   → 31 repos
Taxonomy of the 31, grouped by approach:
  report → triage → FHIR → clinicians   StreamReach, StreamLink, StreamFhir, StreamProof, Riffle,
                                        AquaSentinel(-AI), StreamSentinel, streamcheck, streamvitals
  field-visit planning / sampling       Catchment ("make the next sample count"), Rill (field plans
                                        + rechecks), StreamKeepers (points that follow what science needs)
  form reliability                      Same Stream (randomised reliability study, Track 1)
  photo → score                         AquaPlot
  dashboards / maps                     OneAqua-Insight-Hub, streamhealth-oneaquahealth
  pharmaceuticals                       Downstream (+ one peer team's private plan)
  birdsong / mosquitoes / blooms        Murmur / BiteCast / Freshwater-Sentinel
  gamification                          Aqua Quest
  ─────────────────────────────────────────────────────────────────────────
  restoration measures · DSS            ← no entry found
Verification queries   q=oneaquahealth+restoration                        → 0
                       q=restoration+stream  created:>2026-08-01          → 10, 0 relevant (ML / video / KV-cache)
                       q=rehabilitation+urban+stream created:>2026-07-01  → 0
                       q=BACI+monitoring created:>2026-07-01              → 0
                       Rill README states it does NOT recommend restoration measures or use the Catalogue
Verdict            observation→triage→FHIR lane = RED · sampling-allocation lane = YELLOW (3 entries)
                   restoration-measure / decision-support lane = GREEN
Blind spots        Devpost gallery is unpublished until judging; private repos are invisible;
                   GitHub code search needs auth (403). Absence is "not publicly discoverable today",
                   not proven.
Re-check           re-run the 5 queries on Oct 3 before freeze.
```

Every other team starts at the observation and stops at an alert, a FHIR export, or a field visit. **Nobody asks
the question the observation exists to answer: what should the city do to this stream, in what order, and did it
work?**

### The warrant: why the cell is empty

| Candidate reason | Ruled out? |
|---|---|
| Nobody noticed | **Yes, this is the reason.** The catalogue (D2.4) was published 22 Dec 2025 as a 15 MB PDF. It isn't linked from the hackathon page, and it reads as a report, not as a dataset |
| The data doesn't exist | Ruled out. D2.4 is CC-BY 4.0, and `pdftotext` extracts it cleanly: 6,066 lines, a numbered table of contents, 43 numbered measures, 12 named stressors |
| Not judge-aligned | Ruled out. D2.4's own executive summary says it is *"essential input for the development of the OneAquaHealth Decision Support System"*, and Feio is an author |
| Infeasible in 5 days | Ruled out. The engine is a rule table plus a bootstrap. No ML training, no hardware, no external API on the critical path |

---

## 2 · The negation (what the field believes that is wrong)

**The default belief:** *a restoration succeeds when it is built*. Plant the trees, remove the weir, cut the
ribbon. Monitoring is optional. The order of measures is whatever the budget or the photo-op favours.

**Why it is wrong, in the consortium's own words (D2.4):**
- *"The absence of well-defined objectives, success criteria, or end points against which progress can be
  evaluated remains a major challenge in river restoration assessment"* (§2.2, p.21, citing Moore & Rutherfurd 2017).
- *"It is like fixing the leaks in a bucket before trying to fill it"* (§2.2, p.19). Without first-line measures,
  *"the effectiveness of subsequent measures is greatly reduced."*
- *"It is not enough to just reshape the channel, nor is it enough to only plant trees"* (ECRR, cited p.19).
- Invasive-species removal alone fails: *"invasives simply recolonize the restored sites"* (p.20–21).

**The headline number** (VERIFY before use, see §9 Q2): Bernhardt et al. 2005, *Science* 308:636. Of ~37,000 US
river-restoration project records, only **~10%** recorded any assessment or monitoring.
**Fallback if the figure cannot be verified from the paper:** drop the number and lead with the D2.4 quote above.
Never quote a number we have not read at its source.

**The number we measure ourselves** (Phase 1 of the build, §5 of implementation): run D2.4's own case studies
(Emscher, Bièvre, Isar, Alviela/Vaqueiros, Sourinho, La Marjal, Kallang, CresceRio) through the engine. Publish
three rows: plans encoded · plans the hierarchy accepts · plans whose published record lets a verdict be computed
(needs baseline + after data). The expected shape is "the good ones pass the ladder, and almost none leave data
you could run a BACI on". That second count is the gap Firstline closes. **Record whatever the count turns out
to be.** If it contradicts the expectation, that is the finding.

---

## 3 · The idea

### Name: **Firstline**

- *First-line* is the catalogue's own word for its essential tier (*"First line (essential)"*, p.19). It is also
  medicine's word for the treatment you must try before escalating. Feio reads her vocabulary; the digital-health
  judges read theirs.
- Two morphemes, and the name enforces an order. 9 characters. The first README sentence carries the verb:
  *"Firstline refuses a stream-restoration plan that fills the bucket before fixing the leaks."*
- Backup name if a collision matters: **Leakfirst**.

### One sentence

**Firstline turns OneAquaHealth's Catalogue of Measures into a prescriber for urban streams. It diagnoses the
stressors from citizen and field evidence, prescribes measures in the catalogue's first-line order and refuses
out-of-order plans with the page that forbids them, then schedules citizen check-ups as a
Before-After-Control-Impact design and returns a verdict on whether the measure worked, or says honestly that it
cannot know yet.**

### What it is NOT

Not a dashboard. Not an alert system. Not a triage queue. Not an AI that "recommends restoration". The model never
owns a verdict. Not the official OneAquaHealth DSS, and not endorsed by the consortium. It is an independent,
working prototype built on the consortium's CC-BY deliverables, with attribution.

### The mechanism (one noun-phrase): **a hierarchy-gated prescription with a BACI outcome verdict**

It is Figure 60 of D2.4 running as software. The figure's cycle is indicators → stressors → measures → functions
→ services → health. Firstline executes the first three arrows and closes the loop with an outcome verdict.

```
  EVIDENCE                 DIAGNOSIS                PRESCRIPTION                   FOLLOW-UP
  citizen check-up    →    12 D2.4 stressors   →    43 D2.4 measures on the   →    BACI schedule
  field-form items         CONFIRMED /              first-line ladder              (impact reach + control reach)
  (OAH protocols)          SUSPECTED /              INDICATED / CONTRAINDICATED /  IMPROVED / NO DETECTABLE CHANGE /
                           NOT ASSESSED             DEFERRED / SYMPTOM-ONLY        NOT YET KNOWABLE / CONFOUNDED
                           (+ the observation       (+ the D2.4 page that          (+ visits still needed)
                            that would settle it)    forbids it)
```

### The three roles (who owns what)

| Role | Who | Owns | Never owns |
|---|---|---|---|
| **Proposer** | LLM (Gemini 2.5 Flash via OpenRouter) | Reads a citizen's free-text note and proposes candidate stressors, quoting the words it relied on. Drafts plain-language plan summaries and SMART-objective wording | Any stressor status, any measure verdict, any outcome verdict |
| **Adjudicator** | Deterministic TypeScript engine, seeded, offline, replayable | Stressor status, measure eligibility and refusals, BACI design, the outcome verdict, visits-still-needed | Prose |
| **Approver** | The city's stream officer | Signing the plan; overriding a refusal, and only with a written reason that goes into the plan's override ledger | The evidence |

The whole app works with the model unplugged. The proposer's output is shown as *"Proposed · not evidence"* until
a human accepts it.

### The rules the adjudicator enforces (each cites D2.4)

| Rule | What it refuses | Citation |
|---|---|---|
| **R1 Leaks first** | A second-line (structural) measure while a first-line stressor (water pollution, riparian loss, hydrological/sealing) is CONFIRMED and unaddressed in the plan → `CONTRAINDICATED` | §2.2 p.19–20 |
| **R1a Parallel delivery** | R1 may be overridden where urban constraints require parallel delivery. The override needs the approver's written reason | §2.2 p.20 |
| **R2 Barrier exception** | Barrier removal or passing is promoted to early priority when a connectivity barrier is the dominant limiting factor | §2.2 p.20 |
| **R3 Symptom only** | Invasive-species control with system-level stressors unaddressed → `SYMPTOM-ONLY` | §2.2 p.20–21 |
| **R4 Last resort** | A compensatory measure (rain gardens, swales, floating wetlands…) with no recorded infeasibility of lines 1–3 → `DEFERRED` | §2.2 p.21 |
| **R5 Package** | A single measure against several confirmed stressors → plan `INCOMPLETE` | ECRR via §2.2 p.19 |
| **R6 SMART** | A measure with no Specific/Measurable/Time-bound objective → the plan cannot be signed | §2.2 p.21 |
| **R7 Lag window** | No outcome verdict before the indicator's response lag has passed. Bioengineered works need 2–3 years to establish → `NOT YET KNOWABLE`, with the date it becomes knowable | §2.3 Fig. 2 p.22; §2.4 p.26 |
| **R8 Controls** | BACI if a control reach exists. If not, before-after with a longer baseline, and the verdict says so. If the control moved as much as the impact → `CONFOUNDED` | §2.3 p.22–23 |

The **tri-state (really four-state) verdict is the product.** A tool that can say *"not yet knowable, 4 more
check-ups and 14 months to go"* is instrumentation. A tool that can only say *"improved"* is marketing.

---

## 4 · The magic moment (the first 45 seconds of the video)

**Before.** A real-looking plan for a Coimbra-style urban reach (scenario data, labelled as such). The city wants
to re-meander the channel. It is the photogenic, fundable option.

**Action.** Drop *"Stream re-meandering (4.3.3)"* onto the ladder.

**After, beat 1: the refusal.** The rung flashes a stamp: **CONTRAINDICATED · R1 Leaks first · D2.4 p.19**. Water
pollution is CONFIRMED (two check-ups report sewage odour and grey film, and the field-form conductivity is high),
and nothing in the plan addresses it. The engine points to 4.2.2 *Sewer system and point-source improvements* and
quotes the bucket sentence.

**After, beat 2: the "wait, you can do that?" beat.** Jump 18 months. Eleven citizen check-ups have come in from
the impact reach and an upstream control reach. The BACI cross fills in, and the verdict reads **NOT YET KNOWABLE:
riparian establishment window closes Mar 2028 · 3 more check-ups at the control reach would make a 1-point change
detectable.** Then show the Emscher from D2.4's own casebook: sewer first, renaturalisation second. The ladder
accepts it rung by rung. The engine agrees with 30 years of practice.

**The unscripted path** (the one judges actually test): *"Build your own stream"*. Any judge can tick evidence and
drag any of the 43 measures, and every placement gets a verdict with a reason and a page. There is no dead end and
no empty state without a next action.

---

## 5 · Rubric-mapped pitch (descending weight)

- **Impact & Alignment (30).** Built directly on D2.4 (Feio, Dias, Serra 2025), plus the Key Indicators factsheets
  and the Field Sampling Protocols (both May 2026, Feio co-author). It implements the monitoring design D2.4 calls
  best practice (BACI). It is a working prototype of the kind of tool D2.4 says it feeds (the DSS). The coordinator
  will recognise her own catalogue, stressor list, hierarchy and bucket sentence, cited to the page.
- **Innovation (20).** The only entry in the restoration-measure cell (§1). It is also the only one that treats a
  stream the way medicine treats a patient: a contraindication, a prescription and a follow-up with a verdict. And
  the only one whose AI is structurally barred from owning a verdict.
- **Technical (20).** A deterministic rule engine with 8 cited rules and full unit coverage. A seeded bootstrap
  BACI estimator with a visits-to-detectability calculation. Positive controls: the D2.4 casebook must pass. A FHIR
  R4 bundle (`Location`, `Condition`, `DetectedIssue`, `CarePlan`, `Goal`, `Observation`) aligned to the HL7 Europe
  `oah` IG where profiles exist. Offline, replayable, one-command verify.
- **UX (15).** One object on screen, the stream's chart, with one flow: diagnose → prescribe → follow up. Every
  refusal says why and what to do instead. It went through three measured UI loops (implementation §7).
- **Feasibility & Scale (15).** Every European city has WFD-type reaches and a riparian/sewer problem. The catalogue
  is the knowledge base, and it is versioned, so a new edition means a new rule table and nothing else. The
  citizen app becomes the monitoring instrument that restoration projects currently lack. Adoption path: the five
  case-study cities, then any ECRR member.

---

## 6 · Startup potential (short)

- **User:** the municipal stream or blue-green infrastructure officer, and the river trust that runs volunteers.
- **Wedge:** EU Nature Restoration Law (Regulation (EU) 2024/1991) obliges member states to restore river
  connectivity and ecosystems and to *monitor* the result. **VERIFY the article numbers before quoting any.**
  Firstline turns that monitoring duty into citizen check-ups with a statistical design.
- **Model:** per-city licence for the plan-and-verify workspace. The catalogue content stays open.
- **Moat:** the encoded, cited rule table and the outcome dataset that accumulates per measure type. After two
  seasons it is the only place that knows whether live fascines actually worked in Coimbra.

---

## 7 · Competitive landscape (honest)

| Neighbour | Where it stops | Our difference |
|---|---|---|
| Rill, Catchment, StreamKeepers | Decide *where to visit next*. Rill says outright it does not recommend measures | We decide *what to do to the stream*, and verify it |
| StreamLink / StreamFhir / StreamProof / Riffle | Export observations as FHIR `Observation` and warn clinicians | We export the *plan*: `CarePlan`, `Goal`, `DetectedIssue`, outcome |
| Same Stream | Measures whether the citizen form is reliable | Complementary. We consume check-ups and make the verdict's uncertainty explicit |
| Official OAH DSS (in development) | Not public, and we don't know its design | We are a prototype of the tool D2.4 says it will feed, not a replacement. Say so plainly |

---

## 8 · Judge attack (the 10 hardest questions)

1. **"Citizens don't choose restoration measures."** Correct. The officer approves. Citizens supply the two things
   restoration lacks: diagnosis evidence and the follow-up data that D2.4 says is usually missing.
2. **"Can a citizen visual check detect a restoration effect?"** Only for citizen-observable indicators: riparian
   cover, bank erosion, litter, odour, colour, visible algae, flow. For diatoms and invertebrates the engine
   schedules *professional* sampling per the Field Sampling Protocols, and it labels which indicator is which.
3. **"Your data is fake."** The *scenario* data is labelled "Scenario · not field records" on every surface where
   it appears. The *catalogue*, the stressors, the rules and the casebook are real and cited to the page. The
   engine is real and runs on any data you type in.
4. **"Why rules and not ML?"** A verdict about public money must be replayable and contestable. Every refusal
   carries the page that justifies it, and a model can't be cross-examined that way.
5. **"What stops the LLM hallucinating a stressor?"** It can only *propose*, and it must quote the source words.
   A proposal is not evidence until a human accepts it, and the verdict engine never reads prose.
6. **"The hierarchy is a guideline, not a law."** Hence R1a. The officer may override, and the override is signed,
   reasoned and exported in the plan. That is the digital version of D2.4's own "in parallel where urban
   constraints require".
7. **"BACI with 11 ordinal check-ups is weak statistics."** Yes, and the tool says so. That is why NOT YET
   KNOWABLE exists and why it reports *visits still needed*. It is honest about power instead of drawing a trend
   line.
8. **"Why FHIR for a river?"** OneAquaHealth has an HL7 Europe IG (`hl7-eu/oah`) because One Health links the
   stream's record to health records. A restoration plan is a care plan for an ecosystem.
9. **"Isn't this just the catalogue as a website?"** No. The catalogue describes measures; Firstline *refuses*
   plans, *schedules* monitoring and *returns verdicts*. Remove the engine and there is no product.
10. **"Who pays after the hackathon?"** Cities under the Nature Restoration Law monitoring duty (verify the
    articles), and river trusts running volunteer programmes. The rule table is small, so maintenance is cheap.

---

## 9 · Decisive questions (time-boxed, both branches pre-written)

**Q1. Can we get the exact citizen-assessment items the OAH app asks?** (cap 60 min, Sep 30 AM)
- **Yes** (the FHIR IG at `build.fhir.org/ig/hl7-eu/oah` or the `hl7-eu/oah` repo has a `Questionnaire`, or
  `apps.oneaquahealth.eu` shows the form): map those exact items to the 12 stressors.
- **No:** use the standardised field form in the *Field Sampling Protocols* (Zenodo 20344421, CC-BY), with site
  characterisation, physicochemistry and hydromorphology items, and label it *"items from OAH Field Sampling
  Protocols v1"*.

**Q2. Is the Bernhardt 2005 "~10% monitored" figure verifiable at source?** (cap 20 min)
- **Yes:** quote it with the exact wording and page.
- **No:** lead with the D2.4 quote only.

**Q3. Does the HL7 `oah` IG define profiles we can conform to?** (cap 45 min)
- **Yes:** set `meta.profile` on the resources that match, and validate with the HL7 validator jar if Java is
  present.
- **No:** use base R4, state it in the README, and validate structure with the FHIR JSON schema.

**Switch date for the fallback:** if the engine plus ladder is not rendering end-to-end by **Oct 1, 18:00 PDT**,
drop the BACI follow-up screen to a static explained example and ship prescription-only (still in the empty cell).

---

## 10 · Final verdict (judgment, not measurement)

- **Win probability, first place: ~3/10.** The field is dense and several entries are polished (Rill ships
  releases). Top-3: roughly even odds *if* the UI loops land and the video opens on the refusal.
- **Why it wins:** it is the only entry built on the coordinator's own newest deliverable, it closes the loop
  every other entry leaves open, and it emits refusals and a "not yet knowable" verdict, which is the cheapest
  proof that real logic exists.
- **Why it loses:** judges who score "citizen science UX" literally may see it as a tool for officers. Scenario
  data may read as thin next to entries with live APIs.
- **Biggest weakness:** no real before/after citizen dataset exists publicly. It is mitigated by the D2.4 casebook
  as the real-data surface, and by explicit labelling.
- **The one move that strengthens it most:** make the casebook replay real and exact (the Emscher sequence
  accepted rung by rung, with page cites), and put it at 0:30 in the video. That is the moment Feio sees her
  catalogue executing correctly.

## Claims to avoid (carry into README and video)

- Never say "the OneAquaHealth DSS" or imply endorsement. Say "built on OneAquaHealth deliverable D2.4 (CC-BY 4.0)".
- Never say "AI recommends". The engine decides and the AI drafts.
- Never present scenario check-ups as field data.
- Never quote a statistic (Bernhardt, the Nature Restoration Law articles, Tieges 2022 Glasgow) until it has been
  read at source. The Tieges figures appear in D2.4 §6 p.132 and may be quoted *as cited in D2.4*.

## Sources

- Devpost rules and overview: https://oneaquahealth-ieee-hackathon.devpost.com/ (fetched 2026-09-29)
- D2.4 Catalogue of measures, Dias, Serra & Feio, 22 Dec 2025, CC-BY 4.0: https://zenodo.org/records/20040211
- Key Indicators factsheets, Schmeller … Feio, 22 May 2026: https://zenodo.org/records/20345207
- Field Sampling Protocols, Calapez … Feio, 22 May 2026: https://zenodo.org/records/20344421
- HL7 Europe IG: https://github.com/hl7-eu/oah
- Rill README (states no restoration measures): https://github.com/shi1720/OneAquaHealth
- Catchment README: https://github.com/shi1720/catchment-oneaquahealth
