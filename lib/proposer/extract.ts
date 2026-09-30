import type { RawProposal } from './quote-check'

/** Tolerant JSON extraction for providers that ignore response_format: fences, prose around the JSON, trailing text. */
export function extractJson(text: string): unknown {
  const t = text.trim()
  const tryParse = (s: string): unknown => {
    try {
      return JSON.parse(s)
    } catch {
      return undefined
    }
  }
  const direct = tryParse(t)
  if (direct !== undefined) return direct
  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(t)
  if (fence?.[1]) {
    const f = tryParse(fence[1].trim())
    if (f !== undefined) return f
  }
  // First balanced {...} or [...] outside of strings.
  for (let i = 0; i < t.length; i++) {
    const open = t[i]
    if (open !== '{' && open !== '[') continue
    const close = open === '{' ? '}' : ']'
    let depth = 0
    let inStr = false
    for (let j = i; j < t.length; j++) {
      const c = t[j]
      if (inStr) {
        if (c === '\\') j++
        else if (c === '"') inStr = false
      } else if (c === '"') inStr = true
      else if (c === open) depth++
      else if (c === close && --depth === 0) {
        const v = tryParse(t.slice(i, j + 1))
        if (v !== undefined) return v
        break
      }
    }
  }
  return undefined
}

/** Accepts {proposals:[...]}, a bare array, or nothing usable (returns undefined). */
export function rawProposalsFrom(value: unknown): RawProposal[] | undefined {
  const arr = Array.isArray(value) ? value : value && typeof value === 'object' ? (value as { proposals?: unknown }).proposals : undefined
  if (!Array.isArray(arr)) return undefined
  return arr.filter((x): x is RawProposal => !!x && typeof x === 'object')
}
