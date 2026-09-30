'use client'
import { useState } from 'react'
import cacheJson from '../data/scenario/proposals.cache.json'
import { stressorById } from '../lib/ui/lookup'
import { toAcceptedProposal } from '../lib/proposer/quote-check'
import { CACHED_BADGE, MAX_NOTE_CHARS, PROPOSED_LABEL, type CacheEntry, type Proposal, type ProposeResponse } from '../lib/proposer/types'
import type { AcceptedProposal } from '../engine/types'
import s from './forms.module.css'

const DEMO = Object.entries((cacheJson as unknown as { entries: Record<string, CacheEntry> }).entries).filter(([, e]) => e.label === 'scenario')
const CHECKUP_ID = 'note-1'

type Phase = { k: 'idle' } | { k: 'loading' } | { k: 'done'; r: ProposeResponse } | { k: 'failed'; msg: string }

export default function Proposer({ accepted, onAccept }: { accepted: AcceptedProposal[]; onAccept: (p: AcceptedProposal) => void }) {
  const [note, setNote] = useState('')
  const [phase, setPhase] = useState<Phase>({ k: 'idle' })
  const [rejected, setRejected] = useState<string[]>([])
  const over = note.length > MAX_NOTE_CHARS

  async function run() {
    setPhase({ k: 'loading' })
    setRejected([])
    try {
      const res = await fetch('/api/propose', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note }) })
      const r = (await res.json()) as ProposeResponse
      setPhase({ k: 'done', r })
    } catch {
      setPhase({ k: 'failed', msg: 'The proposer could not be reached. The engine does not need it.' })
    }
  }
  const key = (p: Proposal) => `${p.stressor}|${p.quote}`
  const isAccepted = (p: Proposal) => accepted.some((a) => a.stressor === p.stressor && a.quote === p.quote)

  return (
    <section className={s.panel} aria-labelledby="prop-h" data-proposer>
      <h3 id="prop-h">Citizen note <span className={s.tagPill}>{PROPOSED_LABEL}</span></h3>
      <p className={s.help}>Paste what a citizen wrote. A model reads it and proposes stressors, each with the exact words it relied on. Words that are not in the note are dropped. You decide what to accept, and an accepted proposal only ever suggests.</p>
      <label htmlFor="note" className={s.lbl}>Note <span className="num">{note.length}</span> / <span className="num">{MAX_NOTE_CHARS}</span></label>
      <textarea id="note" className={s.area} rows={5} value={note} onChange={(e) => setNote(e.target.value)} aria-invalid={over} aria-describedby={over ? 'note-err' : undefined} />
      {over && <p id="note-err" className={s.err} role="alert">That note is over {MAX_NOTE_CHARS} characters. Shorten it.</p>}
      <div className={s.row}>
        <button type="button" className={s.btn} onClick={run} disabled={!note.trim() || over || phase.k === 'loading'} data-propose>
          {phase.k === 'loading' ? 'Reading the note…' : 'Propose stressors'}
        </button>
        {DEMO.map(([id, e], i) => (
          <button key={id} type="button" className={s.btnGhost} onClick={() => { setNote(e.note); setPhase({ k: 'idle' }); setRejected([]) }} data-demo-note={id}>
            Use demo note {i + 1}
          </button>
        ))}
      </div>
      <p className={s.fine}>Demo notes are scenario text written for this demo, not field records.</p>

      <div aria-live="polite" className={s.out}>
        {phase.k === 'loading' && <p className={s.status}>Waiting for the model. The engine chart stays usable.</p>}
        {phase.k === 'failed' && <p className={s.err} role="alert" data-proposer-state="error">{phase.msg}</p>}
        {phase.k === 'done' && <Result r={phase.r} keyOf={key} isAccepted={isAccepted} rejected={rejected} onReject={(p) => setRejected((x) => [...x, key(p)])} onAccept={(p) => onAccept(toAcceptedProposal(p, CHECKUP_ID))} />}
      </div>
    </section>
  )
}

function Result({ r, keyOf, isAccepted, rejected, onReject, onAccept }: {
  r: ProposeResponse; keyOf: (p: Proposal) => string; isAccepted: (p: Proposal) => boolean; rejected: string[]
  onReject: (p: Proposal) => void; onAccept: (p: Proposal) => void
}) {
  if (r.status === 'offline') return <p className={s.offline} data-proposer-state="offline">{r.message}</p>
  if (r.status === 'error') return <p className={s.err} role="alert" data-proposer-state="error">{r.message ?? 'The proposer failed.'}</p>
  return (
    <div data-proposer-state={r.status}>
      <p className={s.status}>
        {r.status === 'cached'
          ? <span className={s.badgeCached} data-badge="cached">{CACHED_BADGE}</span>
          : <span className={s.badgeLive} data-badge="live">Live · {r.model} · <span className="num">{r.latencyMs}</span> ms{r.fallback ? ' · plain-JSON fallback' : ''}</span>}
      </p>
      {r.proposals.length === 0 && <p className={s.help}>The model proposed nothing the note supports.</p>}
      <ul className={s.props}>
        {r.proposals.map((p) => {
          const done = isAccepted(p)
          const rej = rejected.includes(keyOf(p))
          return (
            <li key={keyOf(p)} className={s.prop} data-proposal={p.stressor}>
              <p><span className="num">{p.stressor}</span> {stressorById.get(p.stressor)?.name} <span className={s.tagPill}>{PROPOSED_LABEL}</span></p>
              <p className={s.qt}><q>{p.quote}</q></p>
              <p className={s.fine}>Model confidence <span className="num">{p.confidence.toFixed(2)}</span> (shown for you, never used by the engine)</p>
              {done && <p className={s.ok}>Accepted. It enters the diagnosis as a suggestion, never a confirmation.</p>}
              {rej && <p className={s.fine}>Rejected.</p>}
              {!done && !rej && (
                <div className={s.row}>
                  <button type="button" className={s.btn} onClick={() => onAccept(p)} data-accept={p.stressor}>Accept as a suggestion</button>
                  <button type="button" className={s.btnGhost} onClick={() => onReject(p)}>Reject</button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {r.dropped.length > 0 && (
        <details className={s.dropped} data-dropped={r.dropped.length} open>
          <summary>{r.dropped.length} {r.dropped.length === 1 ? 'proposal' : 'proposals'} dropped: {[...new Set(r.dropped.map((d) => d.reason))].join(', ')}</summary>
          <ul>
            {r.dropped.map((d, i) => <li key={i}><span className="num">{d.stressor}</span> <q>{d.quote}</q> <span className={s.fine}>{d.reason}</span></li>)}
          </ul>
        </details>
      )}
    </div>
  )
}
