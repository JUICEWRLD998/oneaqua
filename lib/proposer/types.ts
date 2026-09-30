/**
 * The proposer's contract. The LLM only ever PROPOSES a stressor with a verbatim quote from a citizen's note.
 * A proposal is "Proposed · not evidence" until a human accepts it in the UI; only then does it enter the engine as an
 * AcceptedProposal (see toAcceptedProposal), and the engine treats that as `suggest`, never `confirm`.
 */
import type { StressorId } from '../../engine/types'

export const MAX_NOTE_CHARS = 2000
export const DEFAULT_MODEL = 'google/gemini-2.5-flash'
export const CACHED_BADGE = 'Cached result · no new model call'
export const OFFLINE_MESSAGE = 'Proposer offline. The engine does not need it.'
export const PROPOSED_LABEL = 'Proposed · not evidence'

export interface Proposal {
  stressor: StressorId
  quote: string
  /** Display only. Clamped to [0, 1]. Never used by the engine. */
  confidence: number
}
export interface Dropped {
  stressor: string
  quote: string
  reason: 'quote not found in note' | 'unknown stressor'
}

export type ProposeStatus = 'live' | 'cached' | 'offline' | 'error'
export interface ProposeResponse {
  status: ProposeStatus
  proposals: Proposal[]
  dropped: Dropped[]
  model: string
  latencyMs: number
  message?: string
  /** UI label for every proposal in this response. */
  label: typeof PROPOSED_LABEL
  /** Set when status is 'cached'. */
  badge?: typeof CACHED_BADGE
  /** True only for the recorded entry that carries a deliberately fabricated proposal (the anti-hallucination beat). */
  plantedControl?: true
  /** Set when the provider rejected response_format json_schema and plain JSON parsing was used. */
  fallback?: 'no-json-schema'
}

export interface CacheEntry {
  /** The demo note (scenario-labelled, not a field record). */
  note: string
  label: 'scenario'
  /** Raw model message content, stored verbatim. The quote check is re-run on it at serve time. */
  raw: string
  model: string
  cachedAt: string
  planted?: boolean
  plantedNote?: string
}
export interface ProposalCache {
  entries: Record<string, CacheEntry>
}

export interface ProposerEnv {
  OPENROUTER_API_KEY?: string
  OPENROUTER_MODEL?: string
  PROPOSER_MODE?: string
}

/** Everything impure is injected so the logic is unit-testable. */
export interface ProposerDeps {
  fetch: typeof fetch
  now: () => number
  env: ProposerEnv
  cache: ProposalCache
  timeoutMs?: number
}

export interface HandlerResult<T> {
  http: number
  json: T
}
