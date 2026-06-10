// The Sandbox's strategy list + toggle semantics.
// Ported verbatim from references/old-app/index.html (~lines 4291–4393).
// The isStrategyOn / toggleStrategy logic lived inline in the old Sandbox
// component; extracted here as pure functions (state in, state out) so the
// hard-won toggle behaviors are testable and shared with the new UI.

/* ────────────────────────────────────────────────────────────────────
   The Sandbox is the heart of the NCC analysis. It shows three columns
   of policy work — Foundations, Distribution, SEAS Gen Electives — and
   lets the user toggle the seven strategies that move CU between them.

   Per Michelle (May '26): the goal is reducing the 11–13 CU baseline of
   non-major work by 4–6 CU through some combination of these strategies.
──────────────────────────────────────────────────────────────────── */

import type { DistributionTargets, Strategy, ViperMods } from './types'

export const STRATEGIES: readonly Strategy[] = [
  {
    id: 'distribution',
    label: '12+5+3 → 12+0 (waive distribution)',
    desc: 'LSM is exploring waiving the 5+3 distribution entirely for CDD students. Saves 8 CU.',
    ask: 'high',
    isStrategy: true,
    type: 'distribution',
  },
  {
    id: 'aandsCUWaiver',
    label: 'A&S 3 CU waiver',
    desc: 'Existing OCC policy. Up to 3 of 36 BA CUs waivable upon audit.',
    ask: 'confirmed',
  },
  {
    id: 'doubleCountKite',
    label: 'Kite + Writing → distribution',
    desc: 'Both count toward distribution. Saves 2 CU when distribution is non-zero.',
    ask: 'low',
    pairWith: ['doubleCountWriting'],
  },
  {
    id: 'doubleCountVIPR1300',
    label: 'VIPR 1300 → distribution (up to 2 CU)',
    desc: 'Up to 2 CU of VIPR 1300 count toward distribution. Saves 2 CU when distribution is non-zero.',
    ask: 'low',
  },
  {
    id: 'langWaiver',
    label: 'Foreign Language waived',
    desc: 'Saves up to 2 CU.',
    ask: 'high',
  },
  {
    id: 'kiteLabWaiver',
    label: 'Kite + Key labs in summer',
    desc: 'Main push: offer Kite (and Key, if not waived) lab components in summer sessions. Frees the academic year.',
    ask: 'medium',
  },
  {
    id: 'keyWaiver',
    label: 'Key satisfied by VIPR 1200/1210',
    desc: 'Proposed: VIPR seminars fulfill Key. Status under reconsideration as of May meeting.',
    ask: 'medium',
  },
]

// ---- Distribution profile detection (verbatim from the old Sandbox) ----
export const isZeroDist    = (t: DistributionTargets): boolean => t.SS === 0 && t.H === 0
export const isReducedDist = (t: DistributionTargets): boolean => t.SS === 3 && t.H === 2
export const isMinimalDist = (t: DistributionTargets): boolean => t.SS === 3 && t.H === 1
export const isStandardDist = (t: DistributionTargets): boolean =>
  !isZeroDist(t) && !isReducedDist(t) && !isMinimalDist(t)

/** Whether a strategy row renders as "on" for the given sandbox state. */
export function isStrategyOn(s: Strategy, mods: ViperMods, targets: DistributionTargets): boolean {
  if (s.type === 'distribution') return isZeroDist(targets) || isReducedDist(targets) || isMinimalDist(targets)
  if (s.pairWith) return mods[s.id] && s.pairWith.every(k => mods[k])
  return !!mods[s.id]
}

export interface SandboxToggleState {
  mods: ViperMods
  targets: DistributionTargets
}

/**
 * Toggle a strategy. Pure: returns the next { mods, targets } state.
 * (The old Sandbox called onChangeMods / onChangeTargets directly.)
 */
export function toggleStrategy(
  s: Strategy,
  mods: ViperMods,
  targets: DistributionTargets,
): SandboxToggleState {
  if (s.type === 'distribution') {
    // Toggle between standard (12+5+3) and waived (12+0).
    // LSM's May proposal is the full waiver — that's the headline option.
    if (isZeroDist(targets) || isReducedDist(targets) || isMinimalDist(targets)) {
      return { mods, targets: { N: 12, SS: 5, H: 3 } }
    }
    return { mods, targets: { N: 12, SS: 0, H: 0 } }
  }
  const newVal = !isStrategyOn(s, mods, targets)
  const next: ViperMods = { ...mods, [s.id]: newVal }
  if (s.pairWith) for (const k of s.pairWith) next[k] = newVal
  return { mods: next, targets }
}
