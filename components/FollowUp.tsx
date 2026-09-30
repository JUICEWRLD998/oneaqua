'use client'
import type { AppState } from '../state/model'
import type { Derived } from '../state/model'
import type { OutcomeResult } from '../engine/types'
import { Cite, Verdict } from './marks'
import { BaciContrast, BaciPlot, LagBar } from './figures'
import { indicatorName, measureName, ruleById } from '../lib/ui/lookup'
import s from './chart.module.css'

const f2 = (x: number) => (Math.round(x * 100) / 100).toFixed(2)
const sg = (x: number) => (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x).toFixed(2)

interface Props {
  state: AppState
  derived: Derived
  /** Only the scenario has a planted control shift to demonstrate CONFOUNDED. */
  canToggleControl: boolean
  onToggleControl: () => void
}

function Card({ o, builtOn, asOf }: { o: OutcomeResult; builtOn?: string; asOf: string }) {
  const r = o.reasons[0]
  const id = `o-${o.measureId}-${o.indicator}`.replace(/\./g, '_')
  const c = o.cells
  const means = o.verdict !== 'NOT_YET_KNOWABLE'
  const cell = (label: string, cs?: { n: number; mean: number }) => (
    <div><dt>{label}</dt><dd><span className="num">{means && cs ? f2(cs.mean) : 'withheld'}</span> <span className={s.nn}>n <span className="num">{cs?.n ?? 0}</span></span></dd></div>
  )
  return (
    <article className={s.card} data-outcome={o.verdict} data-measure={o.measureId} data-indicator={o.indicator} aria-labelledby={`${id}-h`}>
      <h4 id={`${id}-h`}><span className="num">{o.measureId}</span> {measureName(o.measureId)}: {indicatorName(o.indicator).toLowerCase()}</h4>
      <p className={s.vl}><Verdict v={o.verdict} /> <Cite page={r.page} quote={r.quote} who={`${r.rule} ${ruleById.get(r.rule)?.name ?? ''}`} /></p>
      <p className={s.note}>{r.plain}</p>
      {o.verdict === 'NOT_YET_KNOWABLE' && o.knowableFrom && (
        <p className={s.note} data-nyk>
          Cannot be judged before <strong className="num">{o.knowableFrom}</strong>.
          {o.visitsNeeded ? <> Check-ups still needed per cell: <span className="num">{o.visitsNeeded}</span>.</> : ' It waits on the clock, not on visits.'}
        </p>
      )}
      {o.contrast !== undefined && o.ci && (
        <p className={s.note}>Contrast <span className="num">{sg(o.contrast)}</span>, {Math.round(o.ci.level * 100)}% interval <span className="num">{sg(o.ci.low)}</span> to <span className="num">{sg(o.ci.high)}</span>, delta <span className="num">{o.delta}</span>.</p>
      )}
      {means && c.beforeControl && c.afterControl && <figure><BaciPlot o={o} id={`${id}-p`} /></figure>}
      {means && o.contrast !== undefined && <figure><BaciContrast o={o} id={`${id}-c`} /></figure>}
      {o.verdict === 'NOT_YET_KNOWABLE' && o.knowableFrom && builtOn && <figure><LagBar builtOn={builtOn} knowableFrom={o.knowableFrom} asOf={asOf} id={`${id}-l`} /></figure>}
      <dl className={s.cells}>
        {cell('Control · before', c.beforeControl)}{cell('Control · after', c.afterControl)}
        {cell('Impact · before', c.beforeImpact)}{cell('Impact · after', c.afterImpact)}
      </dl>
    </article>
  )
}

export default function FollowUp({ state, derived, canToggleControl, onToggleControl }: Props) {
  const { followup, outcomes } = derived
  const built = new Map(state.plan.measures.map((p) => [p.measureId, p.implementedOn]))
  const confounded = state.variant === 'controlMoved'
  return (
    <>
      {followup.items.length === 0 && (
        <p className={s.empty} role="status">Nothing to follow up yet. Place a measure; its indicator, design and the earliest date a verdict is allowed appear here.</p>
      )}
      {canToggleControl && (
        <p className={s.toggleRow}>
          <button type="button" className={s.btnGhost} aria-pressed={confounded} onClick={onToggleControl} data-toggle-control>
            {confounded ? 'Control reach moved too: on' : 'Control reach moved too: off'}
          </button>
          <span className={s.mute}>A planted shift in the scenario data. The same design must stop claiming the measure worked.</span>
        </p>
      )}
      <div className={s.cards}>
        {outcomes.map((o) => <Card key={`${o.measureId}-${o.indicator}`} o={o} builtOn={built.get(o.measureId)} asOf={state.asOf} />)}
      </div>
      {followup.items.length > 0 && (
        <div className={s.tw}>
          <table className={`${s.log} ${s.stack} ${s.sched}`}>
            <caption className={s.capTxt}>Follow-up schedule</caption>
            <thead><tr><th scope="col">Measure</th><th scope="col">Indicator</th><th scope="col">Design</th><th scope="col">Knowable from</th><th scope="col">Check-ups still needed</th></tr></thead>
            <tbody>
              {followup.items.map((it) => (
                <tr key={`${it.measureId}-${it.indicator}`}>
                  <th scope="row" className="num">{it.measureId}</th>
                  <td>{indicatorName(it.indicator)}</td>
                  <td className="num">{it.design}</td>
                  <td className="num">{it.knowableFrom ?? 'not built yet'}</td>
                  <td className="num">{it.knowableFrom === null ? it.visitsNeeded.afterImpact : 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
