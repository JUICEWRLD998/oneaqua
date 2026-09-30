'use client'
import { useMemo, useState } from 'react'
import { listCases, replay } from '../state/casebook'
import { Cite, Verdict } from './marks'
import { stressorById, ruleById } from '../lib/ui/lookup'
import c from './casebook.module.css'
import f from './forms.module.css'
import p from './page.module.css'

export default function Casebook() {
  const cases = useMemo(() => listCases(), [])
  const [id, setId] = useState('5.1.2')
  const [k, setK] = useState(1)
  const r = useMemo(() => replay(id), [id])
  if (!r) return null
  const shown = r.steps.slice(0, k)
  const refusals = shown.filter((x) => x.verdict === 'CONTRAINDICATED').length
  const done = k >= r.steps.length
  return (
    <article className={p.page} data-page="casebook">
      <header className={p.top}>
        <h1>Casebook</h1>
        <p className={p.lede}>
          Seven D2.4 case studies, replayed through the same engine one measure at a time, in the order each case text gives them.
          Practice that the catalogue reports as accepted should draw no refusal. If it did, the engine would be wrong.
        </p>
      </header>

      <div className={p.split}>
      <section className={`${p.blk} ${p.splitAside}`} aria-labelledby="pick">
        <h2 id="pick">Pick a case</h2>
        <ul className={c.cases}>
          {cases.map((x) => (
            <li key={x.id}>
              <button type="button" className={c.caseBtn} aria-pressed={x.id === id} onClick={() => { setId(x.id); setK(1) }} data-case={x.id}>
                <span className="num">{x.id}</span> {x.name}
                <span className={c.meta}>D2.4 p.{x.page} · <span className="num">{x.measureCount}</span> {x.measureCount === 1 ? 'measure' : 'measures'}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className={p.blk} aria-labelledby="rp">
        <h2 id="rp">{r.name}</h2>
        <p className={p.intro}>
          Stressors the case reports, taken as confirmed:{' '}
          {r.stressors.map((s) => (
            <span key={s.id + s.quote} className={c.st}><span className="num">{s.id}</span> {stressorById.get(s.id)?.name} <Cite page={s.page} quote={s.quote} who={`${r.name}`} /></span>
          ))}
        </p>
        <p className={c.controls}>
          <button type="button" className={f.btn} disabled={done} onClick={() => setK((x) => Math.min(r.steps.length, x + 1))} data-step>
            {done ? 'Sequence complete' : `Place measure ${k + 1} of ${r.steps.length}`}
          </button>
          <button type="button" className={f.btnGhost} disabled={done} onClick={() => setK(r.steps.length)} data-all>Show all</button>
          <button type="button" className={f.btnGhost} disabled={k === 1} onClick={() => setK(1)}>Restart</button>
        </p>
        <p className={c.tally} role="status" data-tally data-refusals={refusals} data-shown={shown.length}>
          <span className="num">{shown.length}</span> of <span className="num">{r.steps.length}</span> {r.steps.length === 1 ? 'measure' : 'measures'} placed,{' '}
          <span className="num">{refusals}</span> {refusals === 1 ? 'refusal' : 'refusals'}.
          {done && refusals === 0 && ' The engine agrees with the case: nothing in it is out of order.'}
        </p>
        <ol className={c.steps}>
          {shown.map((s, i) => (
            <li key={s.measureId} className={c.step} data-step-id={s.measureId} data-verdict={s.verdict}>
              <span className={`${c.n} num`}>{i + 1}</span>
              <div>
                <h3><span className="num">{s.measureId}</span> {s.measureName} <Verdict v={s.verdict} /></h3>
                <p className={c.why}>{s.reason.plain} <Cite page={s.reason.page} quote={s.reason.quote} who={`${s.reason.rule} ${ruleById.get(s.reason.rule)?.name ?? ''}`} /></p>
                <p className={c.case}><span className={c.lbl}>The case text</span> <q>{s.quote}</q> <Cite page={s.page} quote={s.quote} who={r.name} /></p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      </div>
    </article>
  )
}
