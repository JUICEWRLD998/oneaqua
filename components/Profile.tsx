'use client'
import { useEffect, useState } from 'react'
import type { StressorId } from '../engine/types'
import s from './chart.module.css'

interface Props {
  impactLabel: string
  controlLabel: string
  distanceM: number
  confirmed: StressorId[]
  suspected: StressorId[]
  /** Scenario reaches have a documented outfall between them; a user's own stream does not. */
  outfall: boolean
}

/**
 * Longitudinal profile: flow runs left to right, the control reach upstream, then (for the scenario) the outfall, then
 * the impact reach. Drawn: reach points, the distance between them on a metre scale, and the stressor state AT the impact
 * reach. No stressor is drawn at a position along the reach, because no data says where on it each one sits.
 */
export default function Profile({ impactLabel, controlLabel, distanceM, confirmed, suspected, outfall }: Props) {
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 52rem)')
    const on = () => setNarrow(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  const W = narrow ? 420 : 1000
  const H = narrow ? 330 : 290
  const top = 44 // crop the dead band above the labels
  const x0 = narrow ? 34 : 70
  const x1 = W - (narrow ? 34 : 70)
  const cx = x0 + (narrow ? 30 : 50)
  const ix = x1 - (narrow ? 30 : 50)
  const ox = Math.round(cx + (ix - cx) * 0.42)
  const yC = 128, yO = 138, yI = 152
  const pts: [number, number][] = [[x0, yC - 2], [cx, yC], [ox - 26, yO - 6], [ox, yO], [ox + 34, yI - 10], [ix, yI], [x1, yI + 3]]
  const bed = 'M' + pts.map(([x, y]) => `${x} ${y}`).join(' L')
  const depth = 16
  const surface = 'M' + pts.map(([x, y]) => `${x} ${y - depth}`).join(' L')
  const water = `${surface} L${[...pts].reverse().map(([x, y]) => `${x} ${y}`).join(' L')} Z`
  const ground = `${bed} L${x1} ${yI + 15} L${x0} ${yI + 15} Z`
  const ticks: number[] = []
  for (let m = 0; m <= distanceM; m += 100) ticks.push(m)
  const tx = (m: number) => cx + (m / distanceM) * (ix - cx)
  const fx = narrow ? ox + 12 : Math.round((cx + ox) / 2) - 40
  const dimY = 206
  const fs = narrow ? 15 : 14
  return (
    <figure className={s.profile}>
      <svg viewBox={`0 ${top} ${W} ${H - top}`} role="img" aria-labelledby="pf-t pf-d" focusable="false">
        <title id="pf-t">Longitudinal profile of the reach</title>
        <desc id="pf-d">{`Flow runs left to right. The control reach is upstream${outfall ? ', then the outfall' : ''}, then the impact reach, ${distanceM} metres between the two reach points. Confirmed on the impact reach: ${confirmed.join(', ') || 'none yet'}.`}</desc>
        <defs>
          <pattern id="pf-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line className={s.pHatch} x1="0" y1="0" x2="0" y2="8" />
          </pattern>
        </defs>
        <path className={s.pGround} d={ground} />
        <path className={s.pWater} d={water} />
        <path className={s.pSurface} d={surface} />
        <path className={s.pBed} d={bed} />
        <path className={s.pFlow} d={`M${fx} 60 H${fx + 64} M${fx + 56} 55 L${fx + 66} 60 L${fx + 56} 65`} />
        <text className={s.pS} x={fx + 74} y="65" fontSize={fs}>flow</text>
        {[{ x: cx, y: yC, t: 'Control reach', sub: controlLabel }, ...(outfall ? [{ x: ox, y: yO, t: 'Outfall', sub: 'scenario' }] : []), { x: ix, y: yI, t: 'Impact reach', sub: impactLabel }].map((p, i, a) => (
          <g key={p.t}>
            <line className={s.pLead} x1={p.x} y1={p.y} x2={p.x} y2={dimY - 8} />
            <circle className={s.pPt} cx={p.x} cy={p.y} r="6" />
            <text className={s.pT} x={p.x} y={narrow && a.length === 3 && i === 1 ? p.y + 44 : p.y - 48} textAnchor={narrow && i === a.length - 1 ? 'end' : narrow && i === 0 ? 'start' : 'middle'} fontSize={fs + 2}>{p.t}</text>
            <text className={s.pS} x={p.x} y={narrow && a.length === 3 && i === 1 ? p.y + 60 : p.y - 28} textAnchor={narrow && i === a.length - 1 ? 'end' : narrow && i === 0 ? 'start' : 'middle'} fontSize={fs - 1}>{p.sub}</text>
          </g>
        ))}
        <g>
          <line className={s.pDim} x1={cx} y1={dimY} x2={ix} y2={dimY} />
          {ticks.filter((m) => distanceM - m > 60).map((m) => (
            <g key={m}>
              <line className={s.pDim} x1={tx(m)} y1={dimY - 5} x2={tx(m)} y2={dimY + 5} />
              <text className={s.pS} x={tx(m)} y={dimY + 22} textAnchor="middle" fontSize={fs - 2}>{m}</text>
            </g>
          ))}
          <line className={s.pDim} x1={ix} y1={dimY - 5} x2={ix} y2={dimY + 5} />
          <text className={s.pS} x={ix} y={dimY + 22} textAnchor="end" fontSize={fs - 2}>{distanceM} m</text>
          <text className={s.pS} x={(cx + ix) / 2} y={dimY + 50} textAnchor="middle" fontSize={fs - 1}>distance between the two reach points, metres</text>
        </g>
      </svg>
      <figcaption className={s.profCap}>
        <span>Impact reach:</span>
        {confirmed.length === 0 && suspected.length === 0 && <span className={s.mute}>no stressor evidenced yet</span>}
        {confirmed.map((id) => <span key={id} className={`${s.badge} ${s.badgeConf} num`}>{id} confirmed</span>)}
        {suspected.map((id) => <span key={id} className={`${s.badge} num`}>{id} suspected</span>)}
      </figcaption>
    </figure>
  )
}
