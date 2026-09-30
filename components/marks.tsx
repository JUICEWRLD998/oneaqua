'use client'
import { useEffect, useId, useRef, useState, type ReactElement } from 'react'
import s from './marks.module.css'

/** Verdict vocabulary: shape + word + colour, never colour alone. */
type Kind = 'confirmed' | 'suspected' | 'notassessed' | 'contra' | 'improved' | 'nyk' | 'confounded'
const KIND: Record<string, Kind> = {
  CONFIRMED: 'confirmed', SUSPECTED: 'suspected', NOT_ASSESSED: 'notassessed',
  CONTRAINDICATED: 'contra', BLOCKED: 'contra', DECLINED: 'contra',
  IMPROVED: 'improved', INDICATED: 'improved', SIGNABLE: 'improved',
  NOT_YET_KNOWABLE: 'nyk', DEFERRED: 'nyk', NO_DETECTABLE_CHANGE: 'nyk',
  CONFOUNDED: 'confounded',
  SYMPTOM_ONLY: 'suspected', ALLOWED_BY_OVERRIDE: 'confounded', INCOMPLETE: 'notassessed',
}
const LABEL: Record<string, string> = {
  CONFIRMED: 'Confirmed', SUSPECTED: 'Suspected', NOT_ASSESSED: 'Not assessed', CONTRAINDICATED: 'Contraindicated',
  IMPROVED: 'Improved', NOT_YET_KNOWABLE: 'Not yet knowable', CONFOUNDED: 'Confounded', INDICATED: 'Indicated',
  BLOCKED: 'Blocked', SIGNABLE: 'Signable', DEFERRED: 'Deferred', SYMPTOM_ONLY: 'Symptom only',
  ALLOWED_BY_OVERRIDE: 'Allowed by override', INCOMPLETE: 'Incomplete', DECLINED: 'Declined', NO_DETECTABLE_CHANGE: 'No detectable change',
}
const GLYPH: Record<Kind, ReactElement> = {
  confirmed: <path d="M6 1.5 L11 10.5 H1 Z" />,
  suspected: <path d="M6 1 L11 6 L6 11 L1 6 Z" />,
  notassessed: <circle cx="6" cy="6" r="4.2" fill="none" strokeWidth="1.6" strokeDasharray="2.2 1.6" />,
  contra: <path d="M2 2 L10 10 M10 2 L2 10" fill="none" strokeWidth="2.2" />,
  improved: <path d="M1.5 6.5 L4.8 9.5 L10.5 2.5" fill="none" strokeWidth="2.2" />,
  nyk: (
    <>
      <circle cx="6" cy="6" r="4.2" fill="none" strokeWidth="1.4" />
      <path d="M6 3.4 V6.2 L7.8 7.2" fill="none" strokeWidth="1.2" />
    </>
  ),
  confounded: (
    <>
      <circle cx="4.2" cy="6" r="3.2" fill="none" strokeWidth="1.5" />
      <circle cx="7.8" cy="6" r="3.2" fill="none" strokeWidth="1.5" />
    </>
  ),
}

export const verdictLabel = (v: string) => LABEL[v] ?? v

export function Verdict({ v, text = true }: { v: string; text?: boolean }) {
  const k = KIND[v]
  if (!k) return <span className={s.verdict}>{v}</span>
  return (
    <span className={`${s.verdict} ${s[k]}`} data-verdict={v}>
      <svg className={s.vg} viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false">{GLYPH[k]}</svg>
      {text ? <span>{LABEL[v]}</span> : <span className="sr">{LABEL[v]}</span>}
    </span>
  )
}

/** The citation chip `D2.4 · p.19`: hover after a beat, focus instantly, click toggles, Escape closes. */
export function Cite({ page, quote, who }: { page: number; quote: string; who: string }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [hover, setHover] = useState(false)
  const root = useRef<HTMLSpanElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [flip, setFlip] = useState(false)
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (root.current && !root.current.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])
  useEffect(() => () => clearTimeout(timer.current), [])
  const show = open || hover
  useEffect(() => {
    if (!show || !root.current) return
    const r = root.current.getBoundingClientRect()
    setFlip(r.left + 360 > window.innerWidth - 12)
  }, [show])
  return (
    <span
      ref={root}
      className={s.cite}
      onMouseEnter={() => { clearTimeout(timer.current); timer.current = setTimeout(() => setHover(true), 500) }}
      onMouseLeave={() => { clearTimeout(timer.current); setHover(false) }}
    >
      <button type="button" className={s.chip} aria-expanded={open} aria-describedby={id} onClick={() => setOpen((o) => !o)} onFocus={() => setHover(true)} onBlur={() => setHover(false)}>
        D2.4 · p.{page}
      </button>
      <span id={id} role="tooltip" className={`${s.quote} ${flip ? s.flip : ''}`} hidden={!show}>
        <q>{quote}</q>
        <span className={s.src}>D2.4 · p.{page} · {who}</span>
      </span>
    </span>
  )
}
