import cacheJson from '../../data/scenario/proposals.cache.json'
import type { ProposalCache, ProposerDeps } from './types'

/** Production wiring for the route handlers. Reads the environment at call time. */
export function runtimeDeps(): ProposerDeps {
  return {
    fetch: (...a) => fetch(...a),
    now: () => Date.now(),
    env: {
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
      OPENROUTER_MODEL: process.env.OPENROUTER_MODEL,
      PROPOSER_MODE: process.env.PROPOSER_MODE,
    },
    cache: cacheJson as unknown as ProposalCache,
  }
}
