/** ISO YYYY-MM-DD date arithmetic on UTC. No clock: every date is passed in. */
const MS_PER_DAY = 86_400_000
const RE = /^(\d{4})-(\d{2})-(\d{2})$/

function fromMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

function parse(s: string): number | null {
  const m = RE.exec(s)
  if (!m) return null
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return fromMs(ms) === s ? ms : null
}

function toMs(iso: string): number {
  const ms = parse(iso)
  if (ms === null) throw new Error(`not an ISO calendar date: ${JSON.stringify(iso)}`)
  return ms
}

export function isIsoDate(s: string): boolean {
  return typeof s === 'string' && parse(s) !== null
}

export function addDays(iso: string, n: number): string {
  return fromMs(toMs(iso) + Math.round(n) * MS_PER_DAY)
}

/** Signed whole days from a to b. */
export function daysBetween(a: string, b: string): number {
  return Math.round((toMs(b) - toMs(a)) / MS_PER_DAY)
}

/** Negative if a < b, 0 if equal, positive if a > b. Both validated. */
export function compareIso(a: string, b: string): number {
  return toMs(a) - toMs(b)
}
