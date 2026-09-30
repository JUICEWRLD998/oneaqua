import { catalogue } from '../../engine/catalogue'
import type { AcceptedProposal, StressorId } from '../../engine/types'
import type { Dropped, Proposal } from './types'

export const MIN_QUOTE_CHARS = 4
const STRESSOR_IDS = new Set<string>(catalogue.stressors.map((s) => s.id))

/** Collapse whitespace, lower-case, and unify curly quotes/dashes so a verbatim quote survives typography. */
export function normalise(s: string): string {
  return s
    .normalize('NFC')
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‐-―]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export interface RawProposal {
  stressor?: unknown
  quote?: unknown
  confidence?: unknown
}

export function clampConfidence(c: unknown): number {
  const n = typeof c === 'number' ? c : typeof c === 'string' ? Number(c) : NaN
  if (!Number.isFinite(n)) return 0
  return Math.min(1, Math.max(0, n))
}

/**
 * The deterministic anti-hallucination gate. A proposal survives only if its stressor is S01..S12 AND its quote
 * (normalised, at least 4 chars) is a substring of the normalised note. Nothing the model says can bypass it.
 */
export function quoteCheck(note: string, raw: RawProposal[]): { proposals: Proposal[]; dropped: Dropped[] } {
  const hay = normalise(note)
  const proposals: Proposal[] = []
  const dropped: Dropped[] = []
  for (const r of raw) {
    const stressor = typeof r.stressor === 'string' ? r.stressor.trim() : String(r.stressor)
    const quote = typeof r.quote === 'string' ? r.quote : ''
    if (!STRESSOR_IDS.has(stressor)) {
      dropped.push({ stressor, quote, reason: 'unknown stressor' })
      continue
    }
    const q = normalise(quote)
    if (q.length < MIN_QUOTE_CHARS || !hay.includes(q)) {
      dropped.push({ stressor, quote, reason: 'quote not found in note' })
      continue
    }
    proposals.push({ stressor: stressor as StressorId, quote, confidence: clampConfidence(r.confidence) })
  }
  return { proposals, dropped }
}

/** Only the UI calls this, after a human accepts a proposal. The engine treats it as `suggest`, never `confirm`. */
export function toAcceptedProposal(p: Pick<Proposal, 'stressor' | 'quote'>, checkupId: string): AcceptedProposal {
  return { stressor: p.stressor, quote: p.quote, checkupId }
}
