'use client'
import { useState } from 'react'
import { checkupItems } from '../engine/catalogue'
import { stressorById } from '../lib/ui/lookup'
import { answerOf, type AppState, type Observer } from '../state/model'
import s from './forms.module.css'

/** The field-form items. Two distinct observers are what lift a stressor from suspected to confirmed. */
const GROUPS = (() => {
  const order = [...new Set(checkupItems.flatMap((i) => i.evidence.map((e) => e.stressor)))].sort()
  const out = order.map((sid) => ({ key: sid as string, title: `${sid} ${stressorById.get(sid)?.name ?? ''}`, items: checkupItems.filter((i) => i.evidence[0]?.stressor === sid) }))
  const rest = checkupItems.filter((i) => i.evidence.length === 0)
  if (rest.length) out.push({ key: 'other', title: 'Also recorded (no stressor mapped to these answers yet)', items: rest })
  return out.filter((g) => g.items.length > 0)
})()

export default function EvidenceSheet({ state, onAnswer }: { state: AppState; onAnswer: (o: Observer, item: string, answer: string | null) => void }) {
  const [obs, setObs] = useState<Observer>('A')
  const counts = (['A', 'B'] as Observer[]).map((o) => checkupItems.filter((i) => answerOf(state, o, i.id) !== undefined).length)
  return (
    <section className={s.panel} aria-labelledby="ev-h" data-evidence>
      <h3 id="ev-h">Evidence sheet</h3>
      <p className={s.help}>Answer what you can see at the stream. One observer only suspects. A second observer who sees the same thing confirms it.</p>
      <div className={s.row} role="group" aria-label="Which observer is filling in the sheet">
        {(['A', 'B'] as Observer[]).map((o, i) => (
          <button key={o} type="button" className={s.btnGhost} aria-pressed={obs === o} onClick={() => setObs(o)} data-observer={o}>
            Observer {o} <span className="num">{counts[i]}</span> answered
          </button>
        ))}
      </div>
      {GROUPS.map((g, gi) => {
        const n = g.items.filter((i) => answerOf(state, obs, i.id) !== undefined).length
        return (
          <details key={g.key} className={s.group} open={gi === 0 || n > 0}>
            <summary>{g.title} <span className={s.fine}><span className="num">{n}</span> of <span className="num">{g.items.length}</span> answered</span></summary>
            <ul className={s.items}>
              {g.items.map((it) => {
                const v = answerOf(state, obs, it.id) ?? ''
                const id = `ev-${obs}-${it.id}`
                return (
                  <li key={it.id} className={s.item}>
                    <label htmlFor={id}>{it.text}</label>
                    <select id={id} className={s.field} value={v} onChange={(e) => onAnswer(obs, it.id, e.target.value === '' ? null : e.target.value)} data-item={it.id}>
                      <option value="">Not answered</option>
                      {it.answers.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </li>
                )
              })}
            </ul>
          </details>
        )
      })}
    </section>
  )
}
