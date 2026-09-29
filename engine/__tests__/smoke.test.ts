import { describe, it, expect } from 'vitest'
import type { Reason, Verdicted } from '../types'

describe('contract', () => {
  it('a verdict carries at least one reason', () => {
    const r: Reason = { rule: 'R1', page: 19, quote: 'q', plain: 'p' }
    const v: Verdicted<'INDICATED'> = { verdict: 'INDICATED', reasons: [r] }
    expect(v.reasons.length).toBeGreaterThan(0)
  })
})
