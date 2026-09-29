import type { Checkup, Plan } from './types'
import raw from '../data/scenario/vale-reach.json'

export interface Reach { id: string; role: 'impact' | 'control'; name: string; lat: number; lon: number }
export interface Scenario {
  _label: string
  asOf: string
  site: { name: string; note: string }
  reaches: Reach[]
  /** Only check-ups dated before this feed the diagnosis (the works change what a citizen sees afterwards). */
  diagnosisCutoff: string
  checkups: Checkup[]
  /** Same story, but the control reach improved too: the BACI verdict must become CONFOUNDED. */
  checkupsControlMoved: Checkup[]
  plans: { naive: Plan; firstline: Plan }
}

/** The labelled demo reach. Every check-up carries provenance "scenario" (asserted by scenario.test.ts). */
export const scenario = raw as unknown as Scenario
