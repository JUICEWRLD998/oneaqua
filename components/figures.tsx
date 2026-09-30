'use client'
import { motion, useReducedMotion } from 'framer-motion'
import type { OutcomeResult } from '../engine/types'
import { catalogue } from '../engine/catalogue'
import s from './figures.module.css'

const f2 = (x: number) => (Math.round(x * 100) / 100).toFixed(2)
const sgn = (x: number) => (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x).toFixed(2)
const ind = (id: string) => catalogue.indicators.find((i) => i.id === id)

/** Before/after means for control and impact, with the counterfactual dotted and the contrast bracketed. Real engine cells. */
export function BaciPlot({ o, id, w = 320, h = 300 }: { o: OutcomeResult; id: string; w?: number; h?: number }) {
  const scale = ind(o.indicator)?.scale ?? { min: 1, max: 5 }
  const c = o.cells
  if (!c.beforeControl || !c.afterControl) return null
  const top = 28, bot = h - 44, left = 44, right = w - 24
  const Y = (v: number) => bot - ((v - scale.min) / (scale.max - scale.min)) * (bot - top)
  const xB = left + (right - left) * 0.22, xA = left + (right - left) * 0.7
  const cB = c.beforeControl, cA = c.afterControl, iB = c.beforeImpact, iA = c.afterImpact
  const cf = iB.mean + (cA.mean - cB.mean)
  const impAbove = iA.mean >= cA.mean
  const dyOf = (above: boolean) => (above ? -12 : 20)
  const grid: number[] = []
  for (let v = scale.min; v <= scale.max; v++) grid.push(v)
  return (
    <svg className={s.baci} viewBox={`0 0 ${w} ${h}`} role="img" aria-labelledby={`${id}-t ${id}-d`} focusable="false" data-v={o.verdict}>
      <title id={`${id}-t`}>Before and after means, control and impact reach</title>
      <desc id={`${id}-d`}>{`${ind(o.indicator)?.name ?? o.indicator}. Control ${f2(cB.mean)} to ${f2(cA.mean)}. Impact ${f2(iB.mean)} to ${f2(iA.mean)}.${o.contrast !== undefined ? ` Contrast ${f2(o.contrast)}.` : ''}`}</desc>
      {grid.map((v) => (
        <g key={v}>
          <line className={s.grid} x1={left} x2={right} y1={Y(v)} y2={Y(v)} />
          <text className={s.tick} x={left - 8} y={Y(v) + 4} textAnchor="end">{v}</text>
        </g>
      ))}
      <line className={s.axis} x1={left} x2={left} y1={top - 6} y2={bot} />
      <text className={s.cap} x={xB} y={h - 18} textAnchor="middle">Before</text>
      <text className={s.cap} x={xA} y={h - 18} textAnchor="middle">After</text>
      <line className={s.ctl} x1={xB} y1={Y(cB.mean)} x2={xA} y2={Y(cA.mean)} />
      {o.contrast !== undefined && (
        <>
          <line className={s.cf} x1={xB} y1={Y(iB.mean)} x2={xA} y2={Y(cf)} />
          <path className={s.contrast} d={`M${xA + 17} ${Y(cf)} H${xA + 22} V${Y(iA.mean)} H${xA + 17}`} />
          <text className={s.num} x={xA + 29} y={(Y(cf) + Y(iA.mean)) / 2 + 4}>{sgn(o.contrast)}</text>
        </>
      )}
      <line className={s.imp} x1={xB} y1={Y(iB.mean)} x2={xA} y2={Y(iA.mean)} />
      <rect className={s.ptc} x={xB - 5} y={Y(cB.mean) - 5} width="10" height="10" />
      <circle className={s.pti} cx={xB} cy={Y(iB.mean)} r="5.5" />
      <rect className={s.ptc} x={xA - 5} y={Y(cA.mean) - 5} width="10" height="10" />
      <circle className={s.pti} cx={xA} cy={Y(iA.mean)} r="5.5" />
      <text className={s.n} x={xB} y={Y(cB.mean) + dyOf(cB.mean >= iB.mean)} textAnchor="middle">n {cB.n}</text>
      <text className={s.n} x={xB} y={Y(iB.mean) + dyOf(iB.mean > cB.mean)} textAnchor="middle">n {iB.n}</text>
      <text className={s.n} x={xA} y={Y(cA.mean) + dyOf(!impAbove)} textAnchor="middle">n {cA.n}</text>
      <text className={s.n} x={xA} y={Y(iA.mean) + dyOf(impAbove)} textAnchor="middle">n {iA.n}</text>
      <text className={s.key} x={right} y={top - 12} textAnchor="end">{scale.min.toFixed(1)} to {scale.max.toFixed(1)} scale · higher is better</text>
    </svg>
  )
}

/** The contrast with its interval against the delta band. The whisker grows on mount (transform only; static under reduced motion). */
export function BaciContrast({ o, id, w = 320, h = 160 }: { o: OutcomeResult; id: string; w?: number; h?: number }) {
  const reduce = useReducedMotion()
  if (o.contrast === undefined || !o.ci) return null
  const lo = Math.min(-1, Math.floor(o.ci.low - 0.25)), hi = Math.max(3, Math.ceil(o.ci.high + 0.25))
  const left = 26, right = w - 26
  const X = (v: number) => left + ((v - lo) / (hi - lo)) * (right - left)
  const y = 72
  const d = o.delta
  const ticks: number[] = []
  for (let v = lo; v <= hi; v++) ticks.push(v)
  const pct = Math.round(o.ci.level * 100)
  return (
    <svg className={s.baci} viewBox={`0 0 ${w} ${h}`} role="img" aria-labelledby={`${id}-t ${id}-d`} focusable="false" data-v={o.verdict}>
      <title id={`${id}-t`}>Contrast with its {pct}% interval against the delta band</title>
      <desc id={`${id}-d`}>{`Contrast ${f2(o.contrast)}, interval ${f2(o.ci.low)} to ${f2(o.ci.high)}, delta ${d}.`}</desc>
      <rect className={s.band} x={X(-d)} y={y - 30} width={X(d) - X(-d)} height="60" />
      {ticks.map((v) => (
        <g key={v}>
          <line className={s.grid} x1={X(v)} x2={X(v)} y1={y + 30} y2={y + 36} />
          <text className={s.tick} x={X(v)} y={y + 52} textAnchor="middle">{v > 0 ? '+' : v < 0 ? '−' : ''}{Math.abs(v)}</text>
        </g>
      ))}
      <line className={s.axis} x1={left} x2={right} y1={y + 30} y2={y + 30} />
      <line className={s.zero} x1={X(0)} x2={X(0)} y1={y - 36} y2={y + 30} />
      <text className={s.key} x={X(0)} y={y - 44} textAnchor="middle">no change</text>
      <text className={s.key} x={X(d) + 4} y={y + 26}>delta {d}</text>
      <motion.g
        initial={reduce ? { opacity: 0 } : { scaleX: 0 }}
        animate={reduce ? { opacity: 1 } : { scaleX: 1 }}
        transition={{ duration: reduce ? 0.12 : 0.18, ease: [0.22, 0.61, 0.36, 1] }}
        style={{ transformOrigin: `${X(o.contrast)}px ${y + 8}px`, transformBox: 'view-box' }}
      >
        <line className={s.whisker} x1={X(o.ci.low)} x2={X(o.ci.high)} y1={y + 8} y2={y + 8} />
        <line className={s.whisker} x1={X(o.ci.low)} x2={X(o.ci.low)} y1={y + 1} y2={y + 15} />
        <line className={s.whisker} x1={X(o.ci.high)} x2={X(o.ci.high)} y1={y + 1} y2={y + 15} />
      </motion.g>
      <circle className={s.est} cx={X(o.contrast)} cy={y + 8} r="5.5" />
      <text className={s.num} x={X(o.contrast)} y={y - 12} textAnchor="middle">{sgn(o.contrast)}</text>
      <text className={s.key} x={left} y={h - 6}>{pct}% interval {sgn(o.ci.low)} to {sgn(o.ci.high)}</text>
    </svg>
  )
}

const DAY = 86_400_000
const dayNum = (iso: string) => Math.floor(Date.parse(iso + 'T00:00:00Z') / DAY)

/** NOT_YET_KNOWABLE drawn as a window: works finished, today, and the date a verdict is allowed. */
export function LagBar({ builtOn, knowableFrom, asOf, id, w = 320, h = 100 }: { builtOn: string; knowableFrom: string; asOf: string; id: string; w?: number; h?: number }) {
  const total = Math.max(1, dayNum(knowableFrom) - dayNum(builtOn))
  const done = dayNum(asOf) - dayNum(builtOn)
  const frac = Math.min(1, Math.max(0, done / total))
  const left = 14, right = w - 14
  const X = (f: number) => left + f * (right - left)
  return (
    <svg className={s.baci} viewBox={`0 0 ${w} ${h}`} role="img" aria-labelledby={`${id}-t ${id}-d`} focusable="false">
      <title id={`${id}-t`}>Response lag window</title>
      <desc id={`${id}-d`}>{`Built ${builtOn}. Knowable from ${knowableFrom}. Today is ${asOf}: ${done} of ${total} days.`}</desc>
      <line className={s.lag} x1={X(0)} x2={X(1)} y1="42" y2="42" />
      <line className={s.lagDone} x1={X(0)} x2={X(frac)} y1="42" y2="42" />
      <line className={s.whisker} x1={X(0)} x2={X(0)} y1="32" y2="52" />
      <line className={s.whisker} x1={X(1)} x2={X(1)} y1="32" y2="52" />
      <path className={s.today} d={`M${X(frac)} 26 V58`} />
      <text className={s.key} x={X(0)} y="76">built {builtOn}</text>
      <text className={s.key} x={X(1)} y="76" textAnchor="end">knowable {knowableFrom}</text>
      <text className={s.key} x={X(frac) + 6} y="22">{asOf} · {done} of {total} days</text>
    </svg>
  )
}
