'use client'
import { useState } from 'react'
import { checkupItems } from '../engine/catalogue'
import { answerOf, type AppState, type Observer } from '../state/model'
import s from './forms.module.css'

/** The field-form items. Two distinct observers are what lift a stressor from suspected to confirmed. */
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
      <ul className={s.items}>
        {checkupItems.map((it) => {
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
    </section>
  )
}
