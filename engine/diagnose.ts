import type {
  AcceptedProposal,
  Catalogue,
  Checkup,
  CheckupItem,
  Diagnosis,
  EvidenceRef,
  ReadingRule,
  StressorDiagnosis,
  StressorId,
} from './types'

function cmp(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

function holds(op: ReadingRule['op'], value: number, threshold: number): boolean {
  switch (op) {
    case '>':
      return value > threshold
    case '<':
      return value < threshold
    case '>=':
      return value >= threshold
    case '<=':
      return value <= threshold
  }
}

/**
 * Diagnose every stressor in the catalogue.
 * Only a sourced reading confirms alone; item answers `suggest` (two distinct observers confirm);
 * an accepted LLM proposal is always `suggest` and never counts toward the two-observer rule.
 */
export function diagnose(
  cat: Catalogue,
  checkups: Checkup[],
  items: CheckupItem[],
  readingRules: ReadingRule[],
  proposals: AcceptedProposal[],
): Diagnosis {
  const evidence = new Map<StressorId, EvidenceRef[]>()
  const observers = new Map<StressorId, Set<string>>()
  const push = (s: StressorId, e: EvidenceRef) => {
    const list = evidence.get(s)
    if (list) list.push(e)
    else evidence.set(s, [e])
  }

  for (const c of checkups) {
    for (const item of items) {
      const answer = c.answers[item.id]
      if (answer === undefined) continue
      for (const ev of item.evidence) {
        if (ev.answer !== answer) continue
        // ev.strength is deliberately ignored: a citizen answer never confirms alone.
        push(ev.stressor, { source: 'item', checkupId: c.id, ref: item.id, strength: 'suggest' })
        const set = observers.get(ev.stressor) ?? new Set<string>()
        set.add(c.observer)
        observers.set(ev.stressor, set)
      }
    }
    if (c.readings) {
      for (const rr of readingRules) {
        if (rr.source.trim() === '') continue
        const v = c.readings[rr.id]
        if (v === undefined) continue
        if (holds(rr.op, v, rr.threshold)) {
          push(rr.stressor, { source: 'reading', checkupId: c.id, ref: rr.id, strength: 'confirm' })
        }
      }
    }
  }
  for (const p of proposals) {
    push(p.stressor, { source: 'accepted-proposal', checkupId: p.checkupId, ref: p.quote, strength: 'suggest' })
  }

  const out = {} as Diagnosis
  for (const s of cat.stressors) {
    const ev = [...(evidence.get(s.id) ?? [])].sort(
      (a, b) => cmp(a.checkupId, b.checkupId) || cmp(a.ref, b.ref) || cmp(a.source, b.source),
    )
    const confirmed = ev.some((e) => e.strength === 'confirm') || (observers.get(s.id)?.size ?? 0) >= 2
    const status = confirmed ? 'CONFIRMED' : ev.length > 0 ? 'SUSPECTED' : 'NOT_ASSESSED'
    const settle = new Set<string>()
    if (status !== 'CONFIRMED') {
      for (const rr of readingRules) if (rr.stressor === s.id) settle.add(rr.id)
      for (const it of items) if (it.evidence.some((e) => e.stressor === s.id)) settle.add(it.id)
    }
    const d: StressorDiagnosis = { status, evidence: ev, settleWith: [...settle].sort(cmp) }
    out[s.id] = d
  }
  return out
}
