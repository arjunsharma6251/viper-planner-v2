// Which math sequence a class takes (Arjun, 2026-11-12).
//
// The catalog's plans of study (majors.ts, since 2026-11-12) use the new
// sequence: ESE 2030 for linear algebra, and MATH 2300 or ENM 2510 for
// differential equations. The Class of 2028 and older took the old
// sequence, MATH 2400 / MATH 2410, on both degrees. The Class of 2029 and
// later take the new one on both: a Physics or Math BA takes the same
// courses as the paired BSE, so the math counts for both degrees.
//
// Everything that reads a major's core for a plan goes through
// `majorForClass`, so the seed, the audit and the sample schedule agree.

import { MAJORS } from './majors'
import { alternativesFor } from './seas-catalog'
import type { Major } from './types'

/** The last class on the old MATH 2400 / 2410 sequence. */
export const LAST_OLD_MATH_CLASS = 2028

export function usesOldMath(gradYear: number | null | undefined): boolean {
  return gradYear != null && gradYear <= LAST_OLD_MATH_CLASS
}

/**
 * Old classes: each BSE's new course → the old one it replaced (the cores
 * in majors.ts before 2026-11-12). MEAM already took ENM 2510 then.
 */
const SEAS_OLD: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  CBE: { 'ESE 2030': 'MATH 2400', 'MATH 2300': 'MATH 2410' },
  MSE: { 'ESE 2030': 'MATH 2400', 'ENM 2510': 'MATH 2410' },
  MEAM: { 'ESE 2030': 'MATH 2400' },
  ESE: { 'ESE 2030': 'MATH 2400' },
  CIS: { 'ESE 2030': 'MATH 2400' },
}

/** New classes: the BAs on the old sequence (Arjun: Physics and Math). */
const BA_ON_SEAS_MATH = new Set(['PHYS', 'MATH'])

/**
 * The BSE's differential-equations course a new-class BA takes for MATH 2410.
 * ESE and CIS have none, so MATH 2410 stays a BA requirement there.
 */
const SEAS_DIFFEQ: Readonly<Record<string, string>> = { CBE: 'MATH 2300', MSE: 'ENM 2510', MEAM: 'ENM 2510' }

/** Course swaps (from → to) for one major of a pairing, for this class. */
export function mathSwaps(majorKey: string, otherKey: string | null | undefined, gradYear: number | null | undefined): Record<string, string> {
  const major = MAJORS[majorKey]
  if (!major) return {}
  if (major.school === 'SEAS') return usesOldMath(gradYear) ? { ...(SEAS_OLD[majorKey] ?? {}) } : {}
  if (usesOldMath(gradYear) || !BA_ON_SEAS_MATH.has(majorKey)) return {}
  const swaps: Record<string, string> = { 'MATH 2400': 'ESE 2030' }
  const diffEq = otherKey ? SEAS_DIFFEQ[otherKey] : undefined
  if (diffEq) swaps['MATH 2410'] = diffEq
  return swaps
}

function swapList(codes: readonly string[], swaps: Record<string, string>): string[] {
  const out: string[] = []
  for (const c of codes) {
    const next = swaps[c] ?? c
    if (!out.includes(next)) out.push(next)
  }
  return out
}

function swapSchedule<T extends string>(sched: Readonly<Record<string, T>> | undefined, swaps: Record<string, string>) {
  if (!sched) return sched
  const out: Record<string, T> = {}
  for (const [code, term] of Object.entries(sched)) out[swaps[code] ?? code] = term
  return out
}

/** A major as this class takes it: core, concentration cores and sample schedules with the math swapped. */
export function majorForClass(majorKey: string, otherKey: string | null | undefined, gradYear: number | null | undefined): Major | undefined {
  const major = MAJORS[majorKey]
  if (!major) return undefined
  const swaps = mathSwaps(majorKey, otherKey, gradYear)
  if (Object.keys(swaps).length === 0) return major
  const concentrations: Major['concentrations'] = {}
  for (const [k, c] of Object.entries(major.concentrations)) {
    concentrations[k] = { ...c, extraCore: swapList(c.extraCore ?? [], swaps), sampleSchedule: swapSchedule(c.sampleSchedule, swaps) }
  }
  return {
    ...major,
    sharedCore: swapList(major.sharedCore, swaps),
    sampleSchedule: swapSchedule(major.sampleSchedule, swaps)!,
    concentrations,
  }
}

/**
 * Courses accepted for a swapped core course: the course it replaced, and
 * for a BSE that course's catalog alternatives (an old-class MATH 2400 row
 * still accepts ESE 2030 / ENM 2030 / ENM 2400).
 */
export function classAlternatives(majorKey: string, otherKey: string | null | undefined, gradYear: number | null | undefined, code: string): string[] {
  const swaps = mathSwaps(majorKey, otherKey, gradYear)
  const out: string[] = []
  for (const [from, to] of Object.entries(swaps)) {
    if (to !== code) continue
    out.push(from)
    if (MAJORS[majorKey]?.school === 'SEAS') out.push(...alternativesFor(majorKey, from))
  }
  return out.filter((c, i) => c !== code && out.indexOf(c) === i)
}
