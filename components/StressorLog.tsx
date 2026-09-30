'use client'
import type { Diagnosis } from '../engine/types'
import { catalogue } from '../engine/catalogue'
import { Cite, Verdict } from './marks'
import { settleFor } from '../lib/ui/lookup'
import s from './chart.module.css'

export default function StressorLog({ diagnosis }: { diagnosis: Diagnosis }) {
  const evidenced = catalogue.stressors.filter((x) => diagnosis[x.id].status !== 'NOT_ASSESSED').length
  return (
    <>
      {evidenced === 0 && (
        <p className={s.empty} role="status">
          No stressor is evidenced yet. Tick what you see on the evidence sheet, or accept a proposal from a citizen note, and the log fills in.
        </p>
      )}
      <div className={s.tw}>
        <table className={`${s.log} ${s.stack}`}>
          <caption className="sr">Stressor log: the twelve D2.4 stressors and their state</caption>
          <thead>
            <tr><th scope="col">No.</th><th scope="col">Stressor</th><th scope="col">State</th><th scope="col">Evidence, or what would settle it</th></tr>
          </thead>
          <tbody>
            {catalogue.stressors.map((x) => {
              const d = diagnosis[x.id]
              const settle = settleFor(d.settleWith)
              const proposals = d.evidence.filter((e) => e.source === 'accepted-proposal')
              const items = d.evidence.filter((e) => e.source !== 'accepted-proposal')
              return (
                <tr key={x.id} data-stressor={x.id} data-status={d.status} className={d.status === 'CONFIRMED' ? s.rowConf : undefined}>
                  <th scope="row" className="num">{x.id}</th>
                  <td>
                    {x.name}
                    {x.firstLine && <span className={s.fl}>first line</span>}
                    <span className={s.cited}><Cite page={x.page} quote={x.d24Text} who={`${x.id}, the stressor catalogue`} /></span>
                  </td>
                  <td><Verdict v={d.status} /></td>
                  <td className={s.why}>
                    {d.evidence.length > 0 && (
                      <span className={s.ev}>
                        <span className="num">{items.length}</span> check-up {items.length === 1 ? 'answer' : 'answers'}
                        {proposals.length > 0 && <>, <span className="num">{proposals.length}</span> accepted {proposals.length === 1 ? 'proposal' : 'proposals'} (suggests only)</>}
                      </span>
                    )}
                    {d.status !== 'CONFIRMED' && settle.length > 0 && (
                      <span className={s.ask}>
                        {d.status === 'SUSPECTED' ? 'A second independent observer confirms it. ' : ''}
                        Ask <q>{settle[0]!.text}</q>
                      </span>
                    )}
                    {d.status !== 'CONFIRMED' && settle.length === 0 && <span className={s.mute}>No field-form item maps to this stressor yet.</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
