import { describe, it, expect } from 'vitest'
import { reasonFor, ruleDisabled } from '../reasons'
import { cat } from './fixtures'

describe('reasons', () => {
  it('takes page and quote from the catalogue', () => {
    const r = reasonFor(cat, 'R2', 'because')
    const def = cat.rules.find((x) => x.id === 'R2')!
    expect(r).toEqual({ rule: 'R2', page: def.page, quote: def.quote, plain: 'because' })
    expect('instead' in r).toBe(false)
  })
  it('carries instead when given', () => {
    expect(reasonFor(cat, 'R1', 'x', ['4.2.2']).instead).toEqual(['4.2.2'])
  })
  it('throws when the rule is missing', () => {
    const thin = { ...cat, rules: cat.rules.filter((r) => r.id !== 'R3') }
    expect(() => reasonFor(thin, 'R3', 'x')).toThrow(/R3/)
  })
  it('ruleDisabled reads the option', () => {
    expect(ruleDisabled(undefined, 'R1')).toBe(false)
    expect(ruleDisabled({}, 'R1')).toBe(false)
    expect(ruleDisabled({ disabledRules: ['R1'] }, 'R1')).toBe(true)
    expect(ruleDisabled({ disabledRules: ['R2'] }, 'R1')).toBe(false)
  })
})
