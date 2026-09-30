'use client'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { scenario } from '../engine/scenario'
import { acceptProposal, derive, placeMeasure, removeMeasure, setAnswer, setVariant } from '../state/model'
import { encodeState } from '../state/model'
import { useStore, type Which } from '../lib/ui/store'
import type { StressorId } from '../engine/types'
import Profile from './Profile'
import StressorLog from './StressorLog'
import Prescribe from './Prescribe'
import FollowUp from './FollowUp'
import EvidenceSheet from './EvidenceSheet'
import Proposer from './Proposer'
import p from './page.module.css'
import f from './forms.module.css'

const R = Math.PI / 180
function distanceM(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const dLat = (b.lat - a.lat) * R, dLon = (b.lon - a.lon) * R
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * R) * Math.cos(b.lat * R) * Math.sin(dLon / 2) ** 2
  return Math.round(2 * 6371000 * Math.asin(Math.sqrt(h)))
}
const impact = scenario.reaches.find((r) => r.role === 'impact')!
const control = scenario.reaches.find((r) => r.role === 'control')!
const DIST = distanceM(impact, control)

export default function StreamChart({ which }: { which: Which }) {
  const store = useStore()
  const state = which === 'scenario' ? store.scenario : store.mine
  const d = useMemo(() => derive(state), [state])
  const [copied, setCopied] = useState<'idle' | 'ok' | 'fail'>('idle')
  const mineMode = which === 'mine'
  const ids = Object.keys(d.diagnosis) as StressorId[]
  const confirmed = ids.filter((i) => d.diagnosis[i].status === 'CONFIRMED')
  const suspected = ids.filter((i) => d.diagnosis[i].status === 'SUSPECTED')

  async function copyLink() {
    try {
      const url = `${location.origin}${location.pathname}#${encodeState(state)}`
      await navigator.clipboard.writeText(url)
      setCopied('ok')
    } catch {
      setCopied('fail')
    }
  }

  return (
    <article className={p.page} data-page={mineMode ? 'new' : 'chart'} data-ready={store.ready ? 'yes' : 'no'}>
      <header className={p.top}>
        {!mineMode ? (
          <p className={p.scenario} role="note">{scenario._label}</p>
        ) : (
          <p className={p.scenario} role="note">Your own stream. Nothing here is a field record until you take it to the field; entries stay in this browser tab.</p>
        )}
        <h1>{mineMode ? 'Build your own stream' : 'Stream chart'}</h1>
        <p className={p.lede}>
          {mineMode
            ? 'Tick what you can see, paste a citizen note, then place any of the 43 measures. The engine answers every placement with a verdict and a reason.'
            : 'Long section of the reach: what is wrong, what to do first, and whether it worked.'}
        </p>
        {!mineMode && (
          <Profile impactLabel={impact.id} controlLabel={control.id} distanceM={DIST} confirmed={confirmed} suspected={suspected} outfall />
        )}
        {!mineMode && (
          <div className={p.presets} role="group" aria-label="Plans to try on this reach">
            <span className={p.presetsL}>Try a plan</span>
            <button type="button" className={f.btnGhost} onClick={() => store.loadPreset('empty')} aria-pressed={state.plan.measures.length === 0} data-preset="empty">Empty ladder</button>
            <button type="button" className={f.btnGhost} onClick={() => store.loadPreset('naive')} aria-pressed={state.plan.id === scenario.plans.naive.id} data-preset="naive">Re-meander first (as brought)</button>
            <button type="button" className={f.btnGhost} onClick={() => store.loadPreset('firstline')} aria-pressed={state.plan.id === scenario.plans.firstline.id} data-preset="firstline">Sewer first, built (shows follow-up)</button>
          </div>
        )}
        <p className={p.actions}>
          {!mineMode && (
            <>
              <button type="button" className={f.btnGhost} onClick={copyLink} data-copy-link>Copy link to this plan</button>
              <span className={f.fine} role="status">{copied === 'ok' ? 'Link copied. It carries the plan, not check-up text.' : copied === 'fail' ? 'Could not copy. Select the address bar instead.' : ''}</span>
            </>
          )}
          <button type="button" className={f.btnGhost} onClick={() => store.reset(which)} data-reset>Start again</button>
          <Link className={f.btn} href="/plan/export" data-go-sign>Sign and export</Link>
        </p>
      </header>

      {mineMode && (
        <section className={p.blk} aria-labelledby="h0">
          <h2 id="h0"><span className="num">0</span> Evidence</h2>
          <EvidenceSheet state={state} onAnswer={(o, item, a) => store.update(which, (s) => setAnswer(s, o, item, a))} />
          <Proposer accepted={state.acceptedProposals} onAccept={(ap) => store.update(which, (s) => acceptProposal(s, ap))} />
        </section>
      )}

      <section className={p.blk} id="diagnose" aria-labelledby="h1a">
        <h2 id="h1a"><span className="num">1</span> Diagnose</h2>
        <p className={p.intro}>
          <span className="num">12</span> D2.4 stressors: <span className="num">{confirmed.length}</span> confirmed, <span className="num">{suspected.length}</span> suspected,{' '}
          <span className="num">{12 - confirmed.length - suspected.length}</span> not assessed.
        </p>
        <StressorLog diagnosis={d.diagnosis} />
      </section>

      <section className={p.blk} id="prescribe" aria-labelledby="h2a">
        <h2 id="h2a"><span className="num">2</span> Prescribe</h2>
        <p className={p.intro}>The column reads top down. A higher line is admitted only when the first-line stressors that are confirmed have a measure against them.</p>
        <Prescribe
          state={state}
          assessment={d.assessment}
          onPlace={(id) => store.update(which, (s) => placeMeasure(s, id))}
          onRemove={(id) => store.update(which, (s) => removeMeasure(s, id))}
        />
      </section>

      <section className={p.blk} id="follow" aria-labelledby="h3a">
        <h2 id="h3a"><span className="num">3</span> Follow up</h2>
        <p className={p.intro}>Before and after, control and impact. A verdict is written only when the lag has passed and the design can bear it.</p>
        <FollowUp
          state={state}
          derived={d}
          canToggleControl={!mineMode}
          onToggleControl={() => store.update(which, (s) => setVariant(s, s.variant === 'controlMoved' ? 'base' : 'controlMoved'))}
        />
      </section>
    </article>
  )
}
