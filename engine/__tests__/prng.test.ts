import { describe, it, expect } from 'vitest'
import { hashString, mulberry32 } from '../prng'

describe('prng', () => {
  it('hashString is FNV-1a 32-bit (known vectors)', () => {
    expect(hashString('')).toBe(0x811c9dc5)
    expect(hashString('a')).toBe(0xe40c292c)
    expect(hashString('foobar')).toBe(0xbf9cf968)
  })
  it('same seed gives the same sequence, different seeds differ', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    const c = mulberry32(43)
    const sa = Array.from({ length: 20 }, () => a())
    const sb = Array.from({ length: 20 }, () => b())
    const sc = Array.from({ length: 20 }, () => c())
    expect(sa).toEqual(sb)
    expect(sa).not.toEqual(sc)
  })
  it('outputs lie in [0,1)', () => {
    const r = mulberry32(7)
    for (let i = 0; i < 1000; i++) {
      const x = r()
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThan(1)
    }
  })
})
