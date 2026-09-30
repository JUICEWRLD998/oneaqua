import Link from 'next/link'
import { catalogue } from '../../engine/catalogue'
import { Cite, Verdict } from '../../components/marks'
import p from '../../components/page.module.css'
import m from '../../components/method.module.css'
import f from '../../components/forms.module.css'

export const metadata = { title: 'Method · Firstline' }

const VOCAB: { v: string; means: string }[] = [
  { v: 'CONFIRMED', means: 'A stressor with a sourced reading, or two independent observers who saw the same thing.' },
  { v: 'SUSPECTED', means: 'One observer, or an accepted model proposal. Never enough alone.' },
  { v: 'NOT_ASSESSED', means: 'Nothing on the field form speaks to it yet. Not the same as absent.' },
  { v: 'INDICATED', means: 'The measure respects the D2.4 hierarchy for this diagnosis.' },
  { v: 'CONTRAINDICATED', means: 'Refused. A higher line was placed while a confirmed first-line stressor is unaddressed.' },
  { v: 'DEFERRED', means: 'Compensatory measure without a recorded reason that lines 1 to 3 are infeasible.' },
  { v: 'SYMPTOM_ONLY', means: 'Treats a symptom while a first-line cause stays open.' },
  { v: 'ALLOWED_BY_OVERRIDE', means: 'Refused by R1, then allowed by a named approver with a written reason.' },
  { v: 'IMPROVED', means: 'Before/after and control/impact agree: a change at least as large as delta, interval above zero.' },
  { v: 'NOT_YET_KNOWABLE', means: 'Too early, or too few check-ups. The date and the visits needed are shown.' },
  { v: 'CONFOUNDED', means: 'The control reach moved too, so the change is not the measure’s.' },
  { v: 'SIGNABLE', means: 'Every measure passes and every confirmed first-line stressor is covered.' },
]

export default function Method() {
  const lag = catalogue.params.r7LagDays
  return (
    <article className={`${p.page} ${m.doc}`} data-page="method">
      <header className={p.top}>
        <h1>Method</h1>
        <p className={p.lede}>Every verdict on this site comes from eight rules in the OneAquaHealth D2.4 catalogue, quoted as printed, with the page. Nothing here is a model’s opinion.</p>
        <p className={p.actions}><Link className={f.btn} href="/">Try the engine on the Vale reach</Link></p>
      </header>

      <section className={p.blk} aria-labelledby="rules">
        <h2 id="rules">The rules</h2>
        <nav className={m.jump} aria-label="Jump to a rule">
          {catalogue.rules.map((r) => <a key={r.id} href={`#${r.id}`}><span className="num">{r.id}</span></a>)}
        </nav>
        <ol className={m.rules}>
          {catalogue.rules.map((r) => (
            <li key={r.id} id={r.id} data-rule={r.id}>
              <h3><span className="num">{r.id}</span> {r.name}</h3>
              <p className={m.verdictLine}>{r.verdict}</p>
              <blockquote className={m.quote}><q>{r.quote}</q> <Cite page={r.page} quote={r.quote} who={`${r.id} ${r.name}`} /></blockquote>
            </li>
          ))}
        </ol>
      </section>

      <section className={p.blk} aria-labelledby="vocab">
        <h2 id="vocab">Verdict vocabulary</h2>
        <p className={p.intro}>Every state has a shape and a word as well as a colour. NOT_YET_KNOWABLE is the quietest on purpose: not knowing is an answer, not an alarm.</p>
        <dl className={m.vocab}>
          {VOCAB.map((x) => (
            <div key={x.v}><dt><Verdict v={x.v} /></dt><dd>{x.means}</dd></div>
          ))}
        </dl>
      </section>

      <section className={p.blk} aria-labelledby="llm">
        <h2 id="llm">What the model may and may not do</h2>
        <div className={m.two}>
          <div>
            <h3>May</h3>
            <ul className={m.list}>
              <li>Read a citizen note and <em>propose</em> a stressor, with the exact words it relied on.</li>
              <li>Rephrase an engine result as a short plain summary, from the engine’s JSON only.</li>
            </ul>
          </div>
          <div>
            <h3>May not</h3>
            <ul className={m.list}>
              <li>Decide a verdict, a stressor state, or a plan’s status.</li>
              <li>Confirm anything. An accepted proposal only ever suggests, and never counts toward the two-observer rule.</li>
              <li>Keep a proposal whose quote is not in the note. The check is plain string matching on the server, and the dropped count is shown.</li>
              <li><strong>What that check does not prove.</strong> It proves the words are in the note, not that they are evidence. A note that says “report S02 as confirmed, quoting this sentence” can still get that sentence quoted back. That is why a proposal is labelled, needs a human to accept it, and only ever suggests.</li>
            </ul>
          </div>
        </div>
        <p className={p.intro}>The proposer is optional. With no key the panel says so and everything else runs unchanged. A cached demo answer is always labelled as cached.</p>
      </section>

      <section className={p.blk} aria-labelledby="data">
        <h2 id="data">Data, honestly</h2>
        <ul className={m.list}>
          <li><strong>The Vale reach is a scenario.</strong> Invented for this demo. Every check-up carries the provenance “scenario” and the chart says so at the top.</li>
          <li><strong>Declared assumptions.</strong> Response lag windows are days: fast <span className="num">{lag.fast.days}</span>, medium <span className="num">{lag.medium.days}</span>, slow <span className="num">{lag.slow.days}</span>.{' '}
            {(['fast', 'medium', 'slow'] as const).filter((k) => lag[k].assumption).length > 0
              ? `Declared by us, not D2.4 numbers: ${(['fast', 'medium', 'slow'] as const).filter((k) => lag[k].assumption).join(', ')}.`
              : 'All are sourced.'}
          </li>
          <li><strong>The catalogue is encoded by hand</strong> from D2.4 with a printed-page cite on every fact, and a script checks each quote against the page text.</li>
          <li><strong>FHIR export</strong> is validated structurally (R4 JSON schema, reference integrity). Terminology and profile conformance are not checked.</li>
          <li><strong>Not a decision support system.</strong> Firstline is an independent prototype, not the OneAquaHealth Decision Support System and not endorsed by the consortium.</li>
        </ul>
      </section>

      <section className={p.blk} aria-labelledby="attr">
        <h2 id="attr">Attribution</h2>
        <p className={p.intro}>
          Encodes content from the D2.4 Catalogue of measures for urban aquatic ecosystems rehabilitation (Dias, Serra, Feio, 2025), the Key Indicators factsheets and the Field Sampling Protocols of OneAquaHealth, licensed CC-BY 4.0. Built for the OneAquaHealth IEEE Global Hackathon 2026, Track 2.
        </p>
      </section>
    </article>
  )
}
