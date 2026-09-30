/* eslint-disable @typescript-eslint/no-explicit-any -- test doubles read loosely-typed request bodies */
import { describe, expect, it } from 'vitest'
import { propose, summarize, stripNotes } from '../index'
import { quoteCheck } from '../quote-check'
import { extractJson } from '../extract'
import { CACHED_BADGE, OFFLINE_MESSAGE, type ProposerDeps } from '../types'

const NOTE = 'The water smells of sewage after rain and the bank trees were all cut down last spring.'
const KEY = 'sk-test-SECRET-123'

function reply(content: string, status = 200) {
  return new Response(JSON.stringify({ model: 'm', choices: [{ message: { content }, finish_reason: 'stop' }] }), { status })
}
function deps(over: Partial<ProposerDeps> & { replies?: (() => Response)[] } = {}): ProposerDeps & { calls: { body: Record<string, any> }[] } {
  const calls: { body: Record<string, any> }[] = []
  const queue = [...(over.replies ?? [])]
  return {
    fetch: (async (_u: unknown, init: RequestInit) => {
      calls.push({ body: JSON.parse(String(init.body)) })
      const next = queue.shift()
      if (!next) throw new Error('no reply queued')
      return next()
    }) as unknown as typeof fetch,
    now: () => 0,
    env: { OPENROUTER_API_KEY: KEY },
    cache: { entries: {} },
    calls,
    ...over,
  } as ProposerDeps & { calls: { body: Record<string, any> }[] }
}

describe('quote check (the anti-hallucination gate)', () => {
  it('keeps a verbatim quote, tolerant of case/whitespace', () => {
    const r = quoteCheck(NOTE, [{ stressor: 'S01', quote: 'smells  of SEWAGE', confidence: 2 }])
    expect(r.proposals).toHaveLength(1)
    expect(r.proposals[0]!.confidence).toBe(1)
  })
  it('drops a planted fabricated quote and an unknown stressor, and counts them', () => {
    const r = quoteCheck(NOTE, [
      { stressor: 'S01', quote: 'a dead fish floated past', confidence: 0.9 },
      { stressor: 'S99', quote: 'smells of sewage', confidence: 0.9 },
      { stressor: 'S07', quote: 'bank trees were all cut down', confidence: 0.8 },
    ])
    expect(r.proposals.map((p) => p.stressor)).toEqual(['S07'])
    expect(r.dropped.map((d) => d.reason)).toEqual(['quote not found in note', 'unknown stressor'])
  })
  it('rejects too-short quotes', () => {
    expect(quoteCheck(NOTE, [{ stressor: 'S01', quote: 'the', confidence: 1 }]).proposals).toHaveLength(0)
  })
})

describe('extractJson', () => {
  it('handles fences and surrounding prose', () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 })
    expect(extractJson('Sure! {"a":"}{"} thanks')).toEqual({ a: '}{' })
    expect(extractJson('nothing here')).toBeUndefined()
  })
})

describe('propose', () => {
  it('live: drops the fabricated proposal the model adds', async () => {
    const d = deps({
      replies: [() => reply(JSON.stringify({ proposals: [
        { stressor: 'S01', quote: 'smells of sewage', confidence: 0.9 },
        { stressor: 'S11', quote: 'fish kill observed', confidence: 0.7 },
      ] }))],
    })
    const { http, json } = await propose(d, { note: NOTE })
    expect(http).toBe(200)
    expect(json.status).toBe('live')
    expect(json.proposals.map((p) => p.stressor)).toEqual(['S01'])
    expect(json.dropped).toHaveLength(1)
    expect(d.calls[0]!.body.temperature).toBe(0)
  })
  it('no key: offline message, engine unaffected', async () => {
    const { json } = await propose(deps({ env: {} }), { note: NOTE })
    expect(json.status).toBe('offline')
    expect(json.message).toBe(OFFLINE_MESSAGE)
  })
  it('no key + cache hit: serves cached with badge and re-runs the quote check (planted entry)', async () => {
    const cache = { entries: { a: {
      note: NOTE, label: 'scenario' as const, model: 'm', cachedAt: 'x', planted: true,
      raw: JSON.stringify({ proposals: [{ stressor: 'S01', quote: 'smells of sewage', confidence: 1 }, { stressor: 'S02', quote: 'a weir was built', confidence: 1 }] }),
    } } }
    const d = deps({ env: {}, cache })
    const { json } = await propose(d, { note: `  ${NOTE.toUpperCase()} ` })
    expect(json.status).toBe('cached')
    expect(json.badge).toBe(CACHED_BADGE)
    expect(json.plantedControl).toBe(true)
    expect(json.proposals).toHaveLength(1)
    expect(json.dropped).toHaveLength(1)
    expect(d.calls).toHaveLength(0)
  })
  it('falls back to no-json-schema when the provider rejects response_format', async () => {
    const d = deps({ replies: [() => new Response('{"error":"nope"}', { status: 400 }), () => reply('{"proposals":[]}')] })
    const { json } = await propose(d, { note: NOTE })
    expect(json.status).toBe('live')
    expect(json.fallback).toBe('no-json-schema')
    expect(d.calls[1]!.body.response_format).toBeUndefined()
  })
  it('retries once on 5xx, then reports an error that never leaks the key', async () => {
    const d = deps({ replies: [() => new Response(`boom ${KEY}`, { status: 502 }), () => new Response(`boom ${KEY}`, { status: 502 })] })
    const { json } = await propose(d, { note: NOTE })
    expect(json.status).toBe('error')
    expect(d.calls).toHaveLength(2)
    expect(JSON.stringify(json)).not.toContain(KEY)
  })
  it('validates input', async () => {
    expect((await propose(deps(), {})).http).toBe(400)
    expect((await propose(deps(), { note: 'x'.repeat(2001) })).http).toBe(413)
  })
})

describe('summarize', () => {
  it('prompt carries the engine JSON and no raw notes', async () => {
    const engine = { diagnosis: { S01: { status: 'CONFIRMED' } }, refusals: [{ measure: '4.3.3', reason: 'R1' }], checkups: [{ id: 'ck-1', note: 'SECRET-CITIZEN-NOTE' }] }
    const d = deps({ replies: [() => reply('A plain summary.')] })
    const { json } = await summarize(d, { engine })
    expect(json.summary).toBe('A plain summary.')
    const user = d.calls[0]!.body.messages.find((m: any) => m.role === 'user').content as string
    expect(user).toContain('"S01"')
    expect(user).toContain('"R1"')
    expect(user).not.toContain('SECRET-CITIZEN-NOTE')
    expect(stripNotes(engine)).not.toHaveProperty('checkups.0.note')
  })
  it('offline without a key', async () => {
    expect((await summarize(deps({ env: {} }), { engine: {} })).json.status).toBe('offline')
  })
})
