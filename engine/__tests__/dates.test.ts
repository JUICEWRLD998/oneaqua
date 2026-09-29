import { describe, it, expect } from 'vitest'
import { addDays, daysBetween, isIsoDate, compareIso } from '../dates'

describe('dates', () => {
  it('addDays crosses month, year and leap boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(addDays('2026-03-01', 0)).toBe('2026-03-01')
  })
  it('daysBetween is signed', () => {
    expect(daysBetween('2026-01-01', '2026-01-31')).toBe(30)
    expect(daysBetween('2026-01-31', '2026-01-01')).toBe(-30)
    expect(daysBetween('2026-03-01', '2026-03-01')).toBe(0)
  })
  it('isIsoDate accepts only real calendar dates', () => {
    expect(isIsoDate('2026-02-28')).toBe(true)
    expect(isIsoDate('2026-02-30')).toBe(false)
    expect(isIsoDate('2026-2-3')).toBe(false)
    expect(isIsoDate('')).toBe(false)
    expect(isIsoDate('2026-02-28T00:00')).toBe(false)
    expect(isIsoDate('abcd-ef-gh')).toBe(false)
  })
  it('compareIso orders', () => {
    expect(compareIso('2026-01-01', '2026-01-02')).toBeLessThan(0)
    expect(compareIso('2026-01-02', '2026-01-01')).toBeGreaterThan(0)
    expect(compareIso('2026-01-02', '2026-01-02')).toBe(0)
  })
  it('throws on invalid input', () => {
    expect(() => addDays('nope', 1)).toThrow()
    expect(() => addDays('2026-02-30', 1)).toThrow()
    expect(() => daysBetween('2026-01-01', 'x')).toThrow()
  })
})
