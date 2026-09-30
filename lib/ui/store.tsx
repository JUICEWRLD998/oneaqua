'use client'
/**
 * Client store. Two independent plans: `scenario` (the labelled Vale reach) and `mine` (the unscripted path).
 * Everything the screens show is derived from these by state/model.ts and the engine; nothing here decides a verdict.
 * Persistence is sessionStorage, validated on load (a stored blob is user input), and every access is try/catch'd.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  answerOf, decodeState, encodeState, initialState, setAnswer,
  type AppState, type Observer,
} from '../../state/model'
import { catalogue, checkupItems } from '../../engine/catalogue'

export type Which = 'scenario' | 'mine'
export interface Sign { approver: string; signedAt: string }

interface Store {
  ready: boolean
  scenario: AppState
  mine: AppState
  signed: Partial<Record<Which, Sign>>
  update: (which: Which, fn: (s: AppState) => AppState) => void
  sign: (which: Which, approver: string, now: string) => void
  reset: (which: Which) => void
  loadPreset: (preset: Preset) => void
  loadShared: (hash: string) => boolean
}

const KEY = 'firstline.v1'
const Ctx = createContext<Store | null>(null)

interface Saved {
  scenario: string
  mine: string
  mineAnswers: Record<Observer, Record<string, string>>
  signed: Partial<Record<Which, Sign>>
}

/** The scenario starts with an EMPTY ladder on the real diagnosis, so the first thing a visitor does is place a measure and be answered. */
const fresh = (which: Which): AppState => initialState(which === 'mine' ? 'mine' : 'empty')
export type Preset = 'empty' | 'naive' | 'firstline'

function mineFrom(enc: string, answers: Saved['mineAnswers'] | undefined): AppState {
  const dec = decodeState(enc)
  let s = fresh('mine')
  if (dec) s = { ...s, plan: dec.plan, acceptedProposals: dec.acceptedProposals }
  for (const o of ['A', 'B'] as Observer[]) {
    for (const [item, ans] of Object.entries(answers?.[o] ?? {})) s = setAnswer(s, o, item, ans)
  }
  return s
}

function answersOf(s: AppState): Saved['mineAnswers'] {
  const out: Saved['mineAnswers'] = { A: {}, B: {} }
  for (const o of ['A', 'B'] as Observer[]) {
    for (const it of checkupItems) {
      const a = answerOf(s, o, it.id)
      if (a !== undefined) out[o][it.id] = a
    }
  }
  return out
}

const validSign = (x: unknown): x is Sign =>
  !!x && typeof (x as Sign).approver === 'string' && (x as Sign).approver.trim().length > 0 && typeof (x as Sign).signedAt === 'string'

export function StoreProvider({ children }: { children: ReactNode }) {
  const [scenario, setScenario] = useState<AppState>(() => fresh('scenario'))
  const [mine, setMine] = useState<AppState>(() => fresh('mine'))
  const [signed, setSigned] = useState<Partial<Record<Which, Sign>>>({})
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY)
      if (raw) {
        const j = JSON.parse(raw) as Partial<Saved>
        if (typeof j.scenario === 'string') setScenario(decodeState(j.scenario) ?? fresh('scenario'))
        if (typeof j.mine === 'string') setMine(mineFrom(j.mine, j.mineAnswers))
        const sg: Partial<Record<Which, Sign>> = {}
        if (validSign(j.signed?.scenario)) sg.scenario = j.signed.scenario
        if (validSign(j.signed?.mine)) sg.mine = j.signed.mine
        setSigned(sg)
      }
    } catch {
      /* storage unavailable or corrupt: start fresh */
    }
    try {
      if (location.hash.length > 1) {
        const dec = decodeState(location.hash)
        if (dec) setScenario(dec)
      }
    } catch {
      /* no location */
    }
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return // the hydrating commit still holds the defaults; never write them over the saved blob
    try {
      const v: Saved = { scenario: encodeState(scenario), mine: encodeState(mine), mineAnswers: answersOf(mine), signed }
      sessionStorage.setItem(KEY, JSON.stringify(v))
    } catch {
      /* ignore */
    }
  }, [ready, scenario, mine, signed])

  const update = useCallback((which: Which, fn: (s: AppState) => AppState) => {
    // Any change to a plan voids its signature: you signed what you saw.
    setSigned((g) => (g[which] ? { ...g, [which]: undefined } : g))
    if (which === 'scenario') setScenario(fn)
    else setMine(fn)
  }, [])
  const sign = useCallback((which: Which, approver: string, now: string) => {
    if (approver.trim().length === 0) return
    setSigned((g) => ({ ...g, [which]: { approver: approver.trim(), signedAt: now } }))
  }, [])
  const reset = useCallback((which: Which) => {
    setSigned((g) => ({ ...g, [which]: undefined }))
    if (which === 'scenario') setScenario(fresh('scenario'))
    else setMine(fresh('mine'))
  }, [])
  const loadPreset = useCallback((preset: Preset) => {
    setSigned((g) => ({ ...g, scenario: undefined }))
    setScenario(initialState(preset))
  }, [])
  const loadShared = useCallback((hash: string) => {
    const dec = decodeState(hash)
    if (!dec) return false
    setSigned((g) => ({ ...g, scenario: undefined }))
    setScenario(dec)
    return true
  }, [])

  const value = useMemo<Store>(() => ({ ready, scenario, mine, signed, update, sign, reset, loadPreset, loadShared }), [ready, scenario, mine, signed, update, sign, reset, loadPreset, loadShared])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const v = useContext(Ctx)
  if (!v) throw new Error('useStore outside StoreProvider')
  return v
}

/** Used by tests and the shell: the catalogue sizes the UI promises. */
export const COUNTS = { measures: catalogue.measures.length, stressors: catalogue.stressors.length }
