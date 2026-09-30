'use client'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import type { MeasureAssessment, MeasureId, PlanAssessment, Reason } from '../engine/types'
import type { AppState } from '../state/model'
import { Cite, Verdict, verdictLabel } from './marks'
import { LINES, measureById, measureName, measuresOfLine, ruleById } from '../lib/ui/lookup'
import s from './chart.module.css'

interface Props {
  state: AppState
  assessment: PlanAssessment
  onPlace: (id: MeasureId) => void
  onRemove: (id: MeasureId) => void
}

const CALLOUT = new Set(['CONTRAINDICATED', 'SYMPTOM_ONLY', 'DEFERRED'])

export default function Prescribe({ state, assessment, onPlace, onRemove }: Props) {
  const reduce = useReducedMotion()
  const [filter, setFilter] = useState('')
  const [live, setLive] = useState('')
  const [over, setOver] = useState(false)
  const placedIds = useMemo(() => new Set(state.plan.measures.map((p) => p.measureId)), [state.plan.measures])
  const byId = useMemo(() => new Map(assessment.measures.map((m) => [m.measureId, m])), [assessment.measures])

  const place = (id: MeasureId) => {
    if (placedIds.has(id)) return
    onPlace(id)
    setLive(`${id} ${measureName(id)} placed on the ladder.`)
  }
  const remove = (id: MeasureId) => {
    onRemove(id)
    setLive(`${id} removed from the ladder.`)
  }
  const q = filter.trim().toLowerCase()
  const matches = (id: string) => !q || id.toLowerCase().includes(q) || measureName(id).toLowerCase().includes(q)

  const t = { duration: reduce ? 0.12 : 0.18, ease: [0.22, 0.61, 0.36, 1] as [number, number, number, number] }

  return (
    <div className={s.prescribe}>
      <div
        className={`${s.colWrap} ${over ? s.colOver : ''}`}
        onDragOver={(e) => { e.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); const id = e.dataTransfer.getData('text/plain'); if (measureById.has(id)) place(id) }}
      >
        <p className={`${s.planLine}`} data-plan-verdict={assessment.verdict}>
          <span className={s.mute}>Plan</span> <strong>{state.plan.name}</strong> <Verdict v={assessment.verdict} />
        </p>
        <ul className={s.planReasons}>
          {assessment.reasons.map((r, i) => (
            <li key={i}>{r.plain} <Cite page={r.page} quote={r.quote} who={`${r.rule} ${ruleName(r)}`} /></li>
          ))}
        </ul>
        {state.plan.measures.length === 0 && (
          <p className={s.empty} role="status">
            The ladder is empty. Pick a measure from the list beside it and press Place, or drag it here. The engine answers at once, with the rule and the page.
          </p>
        )}
        <ol className={s.column} aria-label="The D2.4 measure hierarchy, first line at the top">
          {LINES.map((ln) => {
            const here = state.plan.measures.filter((p) => measureById.get(p.measureId)?.line === ln.id)
            return (
              <li key={ln.id} className={s.stratum} data-line={ln.id}>
                <div className={s.sh}>
                  <span className={`${s.sk} num`}>{ln.id.startsWith('C') ? 'C' : ln.id.slice(1)}</span>
                  <span className={s.sn}>{ln.name} <em>{ln.tag}</em></span>
                </div>
                <ul className={s.si}>
                  <AnimatePresence initial={false}>
                    {here.map((p) => {
                      const a = byId.get(p.measureId)
                      return (
                        <motion.li
                          key={p.measureId}
                          layout={!reduce}
                          initial={{ opacity: 0, y: reduce ? 0 : 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={t}
                          className={s.placed}
                          data-placed={p.measureId}
                          data-verdict={a?.verdict}
                        >
                          <span className={`num ${s.mid}`}>{p.measureId}</span>
                          <span className={s.mname}>{measureName(p.measureId)}</span>
                          {a && <Verdict v={a.verdict} />}
                          <button type="button" className={s.linkBtn} onClick={() => remove(p.measureId)} aria-label={`Remove ${p.measureId} ${measureName(p.measureId)} from the ladder`}>Remove</button>
                          {a && <span className={s.reasonLine}>{a.reasons[0].plain} <Cite page={a.reasons[0].page} quote={a.reasons[0].quote} who={`${a.reasons[0].rule} ${ruleName(a.reasons[0])}`} /></span>}
                        </motion.li>
                      )
                    })}
                  </AnimatePresence>
                  {here.length === 0 && <li className={s.none}>Nothing placed.</li>}
                </ul>
              </li>
            )
          })}
        </ol>

        {assessment.measures.filter((m) => CALLOUT.has(m.verdict)).map((m) => (
          <Callout key={m.measureId} m={m} placed={placedIds} onPlace={place} reduce={!!reduce} />
        ))}
        <p className={s.live} role="status" aria-live="polite">{live}</p>
      </div>

      <aside className={s.palette} aria-label="Catalogue of measures">
        <h3>Catalogue <span className="num">{measureCount()}</span> measures</h3>
        <label htmlFor="mfilter" className={s.lbl}>Find a measure</label>
        <input id="mfilter" className={s.field} type="search" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Number or words, e.g. 4.3.3 or meander" />
        {LINES.map((ln) => {
          const list = measuresOfLine(ln.id).filter((m) => matches(m.id))
          if (list.length === 0) return null
          return (
            <details key={ln.id} open={!!q || ln.id === 'L1' || ln.id === 'L2'} className={s.pal}>
              <summary>{ln.name}, {ln.tag} <span className="num">{list.length}</span></summary>
              <ul>
                {list.map((m) => {
                  const on = placedIds.has(m.id)
                  return (
                    <li key={m.id} draggable={!on} onDragStart={(e) => { e.dataTransfer.setData('text/plain', m.id); e.dataTransfer.effectAllowed = 'copy' }} className={s.pitem}>
                      <span className={`num ${s.mid}`}>{m.id}</span>
                      <span className={s.mname}>{m.name}</span>
                      <button type="button" className={s.btnSm} disabled={on} data-place={m.id} onClick={() => place(m.id)} aria-label={`${on ? 'On the ladder' : 'Place'} ${m.id} ${m.name}`}>
                        {on ? 'Placed' : 'Place'}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </details>
          )
        })}
      </aside>
    </div>
  )
}

const measureCount = () => measureById.size
const ruleName = (r: Reason) => ruleById.get(r.rule)?.name ?? ''

function Callout({ m, placed, onPlace, reduce }: { m: MeasureAssessment; placed: Set<string>; onPlace: (id: MeasureId) => void; reduce: boolean }) {
  const r = m.reasons[0]
  const refused = m.verdict === 'CONTRAINDICATED'
  return (
    <motion.aside
      className={`${s.callout} ${refused ? s.refused : s.calloutNote}`}
      aria-labelledby={`co-${m.measureId}`}
      data-callout={m.measureId}
      initial={{ opacity: 0, y: reduce ? 0 : 2 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.12, ease: [0.22, 0.61, 0.36, 1] }}
    >
      <h4 id={`co-${m.measureId}`} className={s.coH}>
        {refused && (
          <span className={s.stamp} role="img" aria-label={`Contraindicated by ${r.rule}, D2.4 page ${r.page}`} data-stamp="CONTRAINDICATED">
            Refused by {r.rule}, D2.4 p.{r.page}
          </span>
        )}
        {!refused && <Verdict v={m.verdict} />}
        <span className="num">{m.measureId}</span> {measureName(m.measureId)}
      </h4>
      <p>{r.plain}</p>
      <p className={s.q}><q>{r.quote}</q> <Cite page={r.page} quote={r.quote} who={`${r.rule} ${ruleName(r)}`} /></p>
      {r.instead && r.instead.length > 0 && (
        <p className={s.instead}>
          <span>The catalogue points to, instead:</span>
          {r.instead.map((id) => (
            <button key={id} type="button" className={s.btnSm} disabled={placed.has(id)} onClick={() => onPlace(id)} data-place-instead={id}>
              {placed.has(id) ? `${id} placed` : `Place ${id} ${measureName(id)}`}
            </button>
          ))}
        </p>
      )}
      {refused && <p className={s.mute}>A written override needs a named approver and a reason of at least 20 characters. <Link href="/plan/export">Sign and export</Link></p>}
      <span className="sr">{verdictLabel(m.verdict)}</span>
    </motion.aside>
  )
}
