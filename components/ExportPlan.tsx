'use client'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { catalogue } from '../engine/catalogue'
import { scenario } from '../engine/scenario'
import { toBundle } from '../engine/fhir'
import { addOverride, checkupsFor, derive } from '../state/model'
import { useStore, type Which } from '../lib/ui/store'
import { Cite, Verdict } from './marks'
import { measureName, ruleById } from '../lib/ui/lookup'
import f from './forms.module.css'
import p from './page.module.css'
import e from './export.module.css'

export const MIN_REASON = 20

export default function ExportPlan() {
  const store = useStore()
  const [which, setWhich] = useState<Which>('scenario')
  const state = which === 'scenario' ? store.scenario : store.mine
  const sign = store.signed[which]
  const d = useMemo(() => derive(state), [state])
  const a = d.assessment
  const refused = a.measures.filter((m) => m.verdict === 'CONTRAINDICATED')
  const [approver, setApprover] = useState('')
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [done, setDone] = useState<Record<string, boolean>>({})
  const [signErr, setSignErr] = useState('')

  const bundle = useMemo(() => {
    try {
      return toBundle({
        catalogue,
        plan: state.plan,
        assessment: a,
        diagnosis: d.diagnosis,
        checkups: checkupsFor(state),
        reaches: scenario.reaches,
        outcomes: d.outcomes,
        exportedAt: sign ? sign.signedAt : `${state.asOf}T00:00:00Z`,
      })
    } catch {
      return null
    }
  }, [state, a, d, sign])
  const json = useMemo(() => (bundle ? JSON.stringify(bundle, null, 2) : ''), [bundle])
  const mitigations = useMemo(() => (bundle?.entry ?? []).filter((r) => r.resource.resourceType === 'DetectedIssue' && Array.isArray((r.resource as { mitigation?: unknown }).mitigation)).length, [bundle])
  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const r of bundle?.entry ?? []) c[r.resource.resourceType] = (c[r.resource.resourceType] ?? 0) + 1
    return c
  }, [bundle])

  function recordOverride(measureId: string) {
    const reason = (reasons[measureId] ?? '').trim()
    if (approver.trim().length === 0) { setErrors((x) => ({ ...x, [measureId]: 'Enter the approver name first.' })); return }
    if (reason.length < MIN_REASON) { setErrors((x) => ({ ...x, [measureId]: `A reason needs at least ${MIN_REASON} characters (${reason.length} so far).` })); return }
    store.update(which, (s) => addOverride(s, { measureId, rule: 'R1', reason, approver: approver.trim() }))
    setErrors((x) => ({ ...x, [measureId]: '' }))
    setDone((x) => ({ ...x, [measureId]: true }))
  }

  function doSign() {
    setSignErr('')
    if (a.verdict !== 'SIGNABLE') { setSignErr(`This plan is ${a.verdict.toLowerCase()}, so it cannot be signed.`); return }
    if (approver.trim().length === 0) { setSignErr('Enter the approver name to sign.'); return }
    store.sign(which, approver, new Date().toISOString())
  }

  function download() {
    const blob = new Blob([json], { type: 'application/fhir+json' })
    const url = URL.createObjectURL(blob)
    const el = document.createElement('a')
    el.href = url
    el.download = `firstline-${state.plan.id}.fhir.json`
    el.click()
    URL.revokeObjectURL(url)
  }

  const overridden = a.overridden

  return (
    <article className={p.page} data-page="export" data-plan-verdict={a.verdict} data-signed={sign ? 'yes' : 'no'} data-mitigations={mitigations}>
      <header className={p.top}>
        <h1>Sign and export</h1>
        <p className={p.lede}>An approver signs the plan. A plan the engine blocks cannot be signed until someone accountable writes down why the order is being broken. The plan leaves as a FHIR R4 bundle.</p>
        <div className={p.presets} role="group" aria-label="Which plan">
          <button type="button" className={f.btnGhost} aria-pressed={which === 'scenario'} onClick={() => setWhich('scenario')} data-which="scenario">Vale scenario plan</button>
          <button type="button" className={f.btnGhost} aria-pressed={which === 'mine'} onClick={() => setWhich('mine')} data-which="mine">My own stream</button>
        </div>
      </header>

      <section className={p.blk} aria-labelledby="sum">
        <h2 id="sum">1 The plan</h2>
        <p className={e.line} data-plan-line><strong>{state.plan.name}</strong> <Verdict v={a.verdict} /></p>
        {state.plan.measures.length === 0 && (
          <p className={e.empty} role="status" data-empty-plan>
            There are no measures in this plan, so there is nothing to sign yet.{' '}
            <Link className={f.btn} href={which === 'mine' ? '/new' : '/'}>{which === 'mine' ? 'Go to Build your own' : 'Open the stream chart'}</Link>
          </p>
        )}
        <ul className={e.reasons}>
          {a.reasons.map((r, i) => <li key={i}>{r.plain} <Cite page={r.page} quote={r.quote} who={`${r.rule} ${ruleById.get(r.rule)?.name ?? ''}`} /></li>)}
        </ul>
        <ul className={e.measures}>
          {a.measures.map((m) => (
            <li key={m.measureId} data-measure={m.measureId} data-verdict={m.verdict}><span className="num">{m.measureId}</span> {measureName(m.measureId)} <Verdict v={m.verdict} /></li>
          ))}
        </ul>
      </section>

      {refused.length > 0 && (
        <section className={p.blk} aria-labelledby="ov">
          <h2 id="ov">2 Override, in writing</h2>
          <p className={p.intro}>{refused.length === 1 ? 'One measure is' : `${refused.length} measures are`} refused by R1. To keep {refused.length === 1 ? 'it' : 'them'}, the approver records a reason of at least {MIN_REASON} characters. By signing, the approver accepts that the confirmed first-line stressors <span className="num">{a.uncovered.join(', ') || 'none'}</span> stay open for now. The override is kept on the plan and exported as a flagged issue with its mitigation.</p>
          <label className={f.lbl} htmlFor="approver">Approver name</label>
          <input id="approver" className={f.field} placeholder="Full name and role" value={approver} onChange={(ev) => setApprover(ev.target.value)} autoComplete="off" />
          {refused.map((m) => {
            const v = reasons[m.measureId] ?? ''
            const err = errors[m.measureId]
            return (
              <div key={m.measureId} className={e.ov} data-override={m.measureId}>
                <p><span className="num">{m.measureId}</span> {measureName(m.measureId)}</p>
                <label className={f.lbl} htmlFor={`r-${m.measureId}`}>Why the order is being broken <span className="num">{v.trim().length}</span> / {MIN_REASON}</label>
                <textarea id={`r-${m.measureId}`} className={f.area} rows={3} value={v} aria-invalid={!!err} aria-describedby={err ? `e-${m.measureId}` : undefined}
                  onChange={(ev) => { setReasons((x) => ({ ...x, [m.measureId]: ev.target.value })); setDone((x) => ({ ...x, [m.measureId]: false })) }} />
                {err && <p id={`e-${m.measureId}`} className={f.err} role="alert" data-override-error>{err}</p>}
                {done[m.measureId] && !err && <p className={f.ok} role="status">Override recorded.</p>}
                <button type="button" className={f.btn} onClick={() => recordOverride(m.measureId)} data-record-override>Record override</button>
              </div>
            )
          })}
        </section>
      )}

      {overridden.length > 0 && (
        <section className={p.blk} aria-labelledby="led">
          <h2 id="led">Override ledger</h2>
          <ul className={e.reasons} data-ledger>
            {overridden.map((o) => <li key={o.measureId}><span className="num">{o.measureId}</span> by {o.approver}: {o.reason}</li>)}
          </ul>
        </section>
      )}

      <section className={p.blk} aria-labelledby="sg">
        <h2 id="sg">{refused.length > 0 || overridden.length > 0 ? '3' : '2'} Sign</h2>
        {!sign ? (
          <>
            {refused.length === 0 && (
              <>
                <label className={f.lbl} htmlFor="approver2">Approver name</label>
                <input id="approver2" className={f.field} placeholder="Full name and role" value={approver} onChange={(ev) => setApprover(ev.target.value)} autoComplete="off" />
              </>
            )}
            <p className={e.row}>
              <button type="button" className={f.btn} onClick={doSign} disabled={a.verdict !== 'SIGNABLE'} data-sign>Sign the plan</button>
              {a.verdict !== 'SIGNABLE' && <span className={f.fine} role="status">Not signable: the plan is <strong>{a.verdict.toLowerCase()}</strong>. {a.verdict === 'BLOCKED' ? 'Fix the order or record an override above.' : 'Complete what the reasons above ask for.'}</span>}
            </p>
            {signErr && <p className={f.err} role="alert">{signErr}</p>}
          </>
        ) : (
          <p className={f.ok} role="status" data-signed-line>Signed by {sign.approver} at <span className="num">{sign.signedAt}</span>. Any later change to the plan voids this signature.</p>
        )}
      </section>

      <section className={p.blk} aria-labelledby="fh">
        <h2 id="fh">FHIR R4 bundle {sign ? '' : <span className={f.tagPill}>unsigned draft</span>}</h2>
        {bundle ? (
          <>
            <p className={p.intro}>
              <span className="num" data-resource-total>{bundle.entry?.length ?? 0}</span> resources:{' '}
              {Object.entries(counts).map(([k, v]) => <span key={k} className={e.count}>{k} <span className="num">{v}</span></span>)}
            </p>
            <p className={e.row}>
              <button type="button" className={f.btn} onClick={download} disabled={!sign} data-download>Download bundle</button>
              {!sign && <span className={f.fine}>Sign the plan to enable the download.</span>}
            </p>
            <details className={e.json} open={false}>
              <summary>View the bundle JSON ({Math.round(json.length / 1024)} KB)</summary>
              <pre tabIndex={0} aria-label="FHIR bundle JSON" data-bundle>{json.length > 40000 ? json.slice(0, 40000) + '\n… (truncated here; the download is complete)' : json}</pre>
            </details>
            <p className={f.fine}>Structural validation of bundles built by this same code runs in <code>npm run validate:fhir</code> (R4 JSON schema, reference integrity). It does not check terminology or profiles.</p>
          </>
        ) : (
          <p className={f.err} role="alert">The bundle could not be built for this plan.</p>
        )}
      </section>
    </article>
  )
}
