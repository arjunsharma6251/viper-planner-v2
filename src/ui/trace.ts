import { createContext, useContext } from 'react'
import type { AugmentedCourse } from '../plan/types'

/** The three buses of the one-line diagram. */
export type Bus = 'ba' | 'bse' | 'energy'

/**
 * Which buses a course feeds. BA = College work, BSE = Engineering work,
 * Energy = a VIPER energy-designated course. VIPER program courses feed
 * both degrees; gen-ed lines feed the College.
 */
export function busesOf(course: Pick<AugmentedCourse, 'category' | 'isEnergy'>): Bus[] {
  const out: Bus[] = []
  const cat = course.category
  if (cat === 'sas' || cat === 'both' || cat === 'viper' || cat === 'gened') out.push('ba')
  if (cat === 'seas' || cat === 'both' || cat === 'viper') out.push('bse')
  if (course.isEnergy) out.push('energy')
  return out
}

export interface TraceState {
  /** Buses lit by the course under the pointer or focus; empty when idle. */
  lit: ReadonlySet<Bus>
  setLit: (buses: Bus[] | null) => void
}

const noop = () => {}

export const TraceContext = createContext<TraceState>({ lit: new Set(), setLit: noop })

export function useTrace(): TraceState {
  return useContext(TraceContext)
}
