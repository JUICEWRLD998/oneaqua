// Live smoke for the proposer. Needs OPENROUTER_API_KEY in .env. Records the demo cache (raw model output, verbatim)
// and evidence/proposer-smoke.txt. One planted entry stores a deliberately fabricated proposal so the UI can show the drop.
import fs from 'node:fs'
import { propose, summarize } from '../lib/proposer'
import type { CacheEntry, ProposalCache, ProposerDeps } from '../lib/proposer/types'

try { process.loadEnvFile('.env') } catch { /* no .env */ }
const env = { OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY, OPENROUTER_MODEL: process.env.OPENROUTER_MODEL }
if (!env.OPENROUTER_API_KEY) { console.error('OPENROUTER_API_KEY missing'); process.exit(1) }

// Scenario-labelled demo notes (invented for the Firstline demo, not field records).
const NOTES: Record<string, string> = {
  'demo-vale-1': 'Walked the Vale stream below the outfall. Strong sewage smell, water cloudy grey, and the willows on the left bank were cleared to the waterline. There is a concrete weir about 200 m down that the trout cannot pass.',
  'demo-vale-planted': 'Second walk at Vale. Sewage smell again near the outfall and the water was cloudy. The bank willows are still gone.',
  'demo-vale-2': 'Quiet morning at Vale. Water looked clear and there was no smell. Some litter caught in the reeds.',
}

let lastRaw = ''
const capturing: typeof fetch = async (u, init) => {
  const res = await fetch(u, init)
  try { lastRaw = (await res.clone().json())?.choices?.[0]?.message?.content ?? '' } catch { lastRaw = '' }
  return res
}
const deps: ProposerDeps = { fetch: capturing, now: Date.now, env, cache: { entries: {} } }

const out: string[] = [`Proposer live smoke · ${new Date().toISOString()}`, `model: ${env.OPENROUTER_MODEL ?? 'google/gemini-2.5-flash (default)'}`, '']
const cache: ProposalCache = { entries: {} }

for (const [id, note] of Object.entries(NOTES)) {
  const { json } = await propose(deps, { note })
  out.push(`## ${id}`, `note: ${note}`, `status: ${json.status} · ${json.latencyMs} ms · ${json.model}${json.fallback ? ' · ' + json.fallback : ''}`)
  for (const p of json.proposals) out.push(`  KEEP ${p.stressor} (${p.confidence}) "${p.quote}"`)
  for (const d of json.dropped) out.push(`  DROP ${d.stressor} "${d.quote}" — ${d.reason}`)
  out.push('')
  if (json.status !== 'live') { console.error(out.join('\n')); process.exit(1) }
  cache.entries[id] = { note, label: 'scenario', raw: lastRaw, model: json.model, cachedAt: new Date().toISOString() }
}

// Planted control: a real recorded reply for 'demo-vale-planted' plus one hand-added fabricated proposal, so the demo
// can show "1 proposal dropped: quote not found in note". The quote check is re-run on this raw text at serve time.
const pl = cache.entries['demo-vale-planted'] as CacheEntry
const planted = JSON.parse(pl.raw) as { proposals: unknown[] }
planted.proposals.push({ stressor: 'S11', quote: 'a fish kill was visible along the bank', confidence: 0.81 })
cache.entries['demo-vale-planted'] = { ...pl, raw: JSON.stringify(planted), planted: true, plantedNote: 'Raw output edited by hand to add a fabricated proposal; the quote check must drop it.' }

const summaryRes = await summarize(deps, { engine: { diagnosis: { S01: { status: 'CONFIRMED' } }, refused: [{ measure: '4.3.3', rule: 'R1' }], verdict: 'NOT_YET_KNOWABLE' } })
out.push('## summarize (engine JSON only)', `status: ${summaryRes.json.status}`, `summary: ${summaryRes.json.summary ?? summaryRes.json.message}`, '')

fs.writeFileSync('data/scenario/proposals.cache.json', JSON.stringify(cache, null, 2) + '\n')
fs.writeFileSync('evidence/proposer-smoke.txt', out.join('\n'))
console.log(out.join('\n'))
