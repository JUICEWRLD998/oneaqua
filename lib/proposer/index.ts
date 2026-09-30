import { catalogue } from '../../engine/catalogue'
import { chat, modelFrom, redact } from './llm'
import { extractJson, rawProposalsFrom } from './extract'
import { normalise, quoteCheck, type RawProposal } from './quote-check'
import {
  CACHED_BADGE, DEFAULT_MODEL, MAX_NOTE_CHARS, OFFLINE_MESSAGE, PROPOSED_LABEL,
  type CacheEntry, type HandlerResult, type ProposeResponse, type ProposerDeps,
} from './types'

export { toAcceptedProposal } from './quote-check'

const STRESSOR_LIST = catalogue.stressors.map((s) => `${s.id} ${s.name}`).join('\n')

const SYSTEM_PROPOSE = `You read one citizen's free-text note about a stream reach and propose which river stressors it gives evidence of.
Stressors (use ONLY these ids):
${STRESSOR_LIST}
Rules:
- Return only stressors the note clearly supports. Zero proposals is a valid answer.
- "quote" MUST be copied verbatim, character for character, from the note. Never paraphrase.
- "confidence" is a number from 0 to 1.
- You propose evidence. You never diagnose, never recommend measures, never give verdicts.`

const RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'proposals',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['proposals'],
      properties: {
        proposals: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['stressor', 'quote', 'confidence'],
            properties: {
              stressor: { type: 'string', enum: catalogue.stressors.map((s) => s.id) },
              quote: { type: 'string' },
              confidence: { type: 'number' },
            },
          },
        },
      },
    },
  },
}

const base = (deps: ProposerDeps, t0: number): { model: string; latencyMs: number; label: typeof PROPOSED_LABEL } => ({ model: modelFrom(deps), latencyMs: deps.now() - t0, label: PROPOSED_LABEL as typeof PROPOSED_LABEL })

function findCached(deps: ProposerDeps, note: string): CacheEntry | undefined {
  const n = normalise(note)
  return Object.values(deps.cache.entries).find((e) => normalise(e.note) === n)
}

function fromRaw(note: string, raw: RawProposal[]) {
  return quoteCheck(note, raw)
}

function serveCached(deps: ProposerDeps, note: string, entry: CacheEntry, t0: number): ProposeResponse {
  // The quote check is re-run at serve time on the stored raw content: the cache can never launder a bad quote.
  const raw = rawProposalsFrom(extractJson(entry.raw)) ?? []
  const { proposals, dropped } = fromRaw(note, raw)
  return {
    status: 'cached', proposals, dropped, ...base(deps, t0), model: entry.model,
    badge: CACHED_BADGE, ...(entry.planted ? { plantedControl: true as const } : {}),
  }
}

/** POST /api/propose. Never throws; every failure is a structured response and the engine never depends on it. */
export async function propose(deps: ProposerDeps, input: unknown): Promise<HandlerResult<ProposeResponse>> {
  const t0 = deps.now()
  const note = typeof (input as { note?: unknown })?.note === 'string' ? (input as { note: string }).note : undefined
  const empty = { proposals: [], dropped: [] }
  if (note === undefined || note.trim() === '') {
    return { http: 400, json: { status: 'error', ...empty, ...base(deps, t0), message: 'A note is required.' } }
  }
  if (note.length > MAX_NOTE_CHARS) {
    return { http: 413, json: { status: 'error', ...empty, ...base(deps, t0), message: `Note exceeds ${MAX_NOTE_CHARS} characters.` } }
  }
  const key = deps.env.OPENROUTER_API_KEY?.trim()
  const cached = findCached(deps, note)
  if (deps.env.PROPOSER_MODE === 'cached' || !key) {
    if (cached) return { http: 200, json: serveCached(deps, note, cached, t0) }
    return { http: 200, json: { status: 'offline', ...empty, ...base(deps, t0), message: OFFLINE_MESSAGE } }
  }

  const res = await chat(
    { ...deps, env: { ...deps.env, OPENROUTER_API_KEY: key } },
    [{ role: 'system', content: SYSTEM_PROPOSE }, { role: 'user', content: `NOTE:\n${note}` }],
    RESPONSE_FORMAT,
  )
  if (!res.ok) {
    if (cached) return { http: 200, json: serveCached(deps, note, cached, t0) }
    return { http: 200, json: { status: 'error', ...empty, ...base(deps, t0), message: redact(res.error, key) } }
  }
  const raw = rawProposalsFrom(extractJson(res.content))
  if (!raw) {
    if (cached) return { http: 200, json: serveCached(deps, note, cached, t0) }
    return { http: 200, json: { status: 'error', ...empty, ...base(deps, t0), model: res.model, message: 'Model reply was not usable JSON.' } }
  }
  const { proposals, dropped } = fromRaw(note, raw)
  return {
    http: 200,
    json: { status: 'live', proposals, dropped, ...base(deps, t0), model: res.model, ...(res.noJsonSchema ? { fallback: 'no-json-schema' as const } : {}) },
  }
}

// ── summaries: drafted ONLY from engine output ────────────────────────────────────────────

const SYSTEM_SUMMARY = `You rephrase a river-restoration plan for a non-expert reader in at most 120 words.
You receive ENGINE JSON: the diagnosis, the plan, refusals with reasons, and verdicts. Everything in it is already decided.
Rules: state only what the JSON states; never add, remove or change a verdict, a refusal, a number or a citation;
do not give advice beyond the JSON; plain prose, no lists, no headings.`

/** Free-text notes must never reach the summary prompt: strip any `note`/`notes` key at any depth. */
export function stripNotes(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(stripNotes)
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v).filter(([k]) => k !== 'note' && k !== 'notes').map(([k, x]) => [k, stripNotes(x)]))
  }
  return v
}

export interface SummaryResponse {
  status: 'live' | 'offline' | 'error'
  summary?: string
  model: string
  latencyMs: number
  message?: string
}

/** POST /api/summarize. Input `{ engine: <engine output> }`. */
export async function summarize(deps: ProposerDeps, input: unknown): Promise<HandlerResult<SummaryResponse>> {
  const t0 = deps.now()
  const engine = (input as { engine?: unknown })?.engine
  const meta = () => ({ model: modelFrom(deps), latencyMs: deps.now() - t0 })
  if (engine === undefined || engine === null || typeof engine !== 'object') {
    return { http: 400, json: { status: 'error', ...meta(), message: 'Engine output is required.' } }
  }
  const key = deps.env.OPENROUTER_API_KEY?.trim()
  if (!key || deps.env.PROPOSER_MODE === 'cached') {
    return { http: 200, json: { status: 'offline', ...meta(), message: OFFLINE_MESSAGE } }
  }
  const res = await chat(
    { ...deps, env: { ...deps.env, OPENROUTER_API_KEY: key } },
    [{ role: 'system', content: SYSTEM_SUMMARY }, { role: 'user', content: `ENGINE JSON:\n${JSON.stringify(stripNotes(engine))}` }],
  )
  if (!res.ok) return { http: 200, json: { status: 'error', ...meta(), message: redact(res.error, key) } }
  return { http: 200, json: { status: 'live', summary: res.content.trim(), model: res.model, latencyMs: deps.now() - t0 } }
}

export { DEFAULT_MODEL }
