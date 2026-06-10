// NCC math regression scenarios (CLAUDE.md "Testing requirements").
// In-term CU is always measured against the FIXED 14 CU baseline
// (6 Foundations + 5+3 distribution) — never derived from current targets.

import { describe, expect, it } from 'vitest'
import type { SemesterKey } from '../data/semesters'
import type { Plan, PlannedCourse } from '../plan/types'
import { computeNCCWorkload } from './compute-workload'
import { computeSEASGenElectives } from './compute-seas-gen'
import { DEFAULT_VIPER_MODS, MOD_PRESETS, normalizeViperMods } from './mods'
import { isStrategyOn, STRATEGIES, toggleStrategy } from './strategies'
import type { DistributionTargets, NCCPlanInput } from './types'

// ---- Fixtures ----

const STANDARD: DistributionTargets = { N: 12, SS: 5, H: 3 } // 12+5+3 (default)
const ZERO: DistributionTargets = { N: 12, SS: 0, H: 0 } // 12+0 (LSM May proposal)

/** All 11 semester slots, like the real emptyPlan (CLAUDE.md trap #2). */
function emptySemesters(): Record<SemesterKey, PlannedCourse[]> {
  return {
    'fall-y1': [], 'spring-y1': [], 'summer-y1': [],
    'fall-y2': [], 'spring-y2': [], 'summer-y2': [],
    'fall-y3': [], 'spring-y3': [], 'summer-y3': [],
    'fall-y4': [], 'spring-y4': [],
  }
}

/** Typed as the REAL Plan semesters map — proves Plan satisfies NCCPlanInput. */
function mkPlan(into?: Partial<Record<SemesterKey, PlannedCourse[]>>): NCCPlanInput {
  return { semesters: { ...emptySemesters(), ...into } }
}

/** "Kite in summer" = the Kite course placed in a summer term of the plan. */
const KITE_COURSE: PlannedCourse = {
  code: 'ARTH 0150',
  title: 'Kite — Humanities Foundation',
  cu: 1,
  category: 'gened',
  slotId: 'ncc-kite',
  intent: { foundation: 'ncc-kite', distribution: 'H' },
}

const planNoSummer = (): NCCPlanInput => mkPlan()
const planKiteInSummer = (): NCCPlanInput => mkPlan({ 'summer-y2': [KITE_COURSE] })

// ---- The five regression scenarios ----

describe('NCC workload regression scenarios', () => {
  it('No mods, no summer → 14 in-term, reduction 0', () => {
    const w = computeNCCWorkload(planNoSummer(), STANDARD, MOD_PRESETS.none.mods)
    expect(w.inTermTotalCU).toBe(14)
    expect(w.reductionCU).toBe(0)
    expect(w.policyTotalCU).toBe(14)
    expect(w.baselineCU).toBe(14)
    expect(w.meetsGoal).toBe(false)
  })

  it('Current memo (defaults), no summer → 8 in-term, reduction 6', () => {
    const w = computeNCCWorkload(planNoSummer(), STANDARD, DEFAULT_VIPER_MODS)
    expect(w.inTermTotalCU).toBe(8)
    expect(w.reductionCU).toBe(6)
    expect(w.meetsGoal).toBe(true)
    // Memo composition: fys + lang waived → 4 Foundations in-term;
    // Kite + Writing + 2×VIPR 1300 double-counts → distribution 8 − 4 = 4.
    expect(w.foundationInTermCU).toBe(4)
    expect(w.distSavedCU).toBe(4)
    expect(w.distNetCU).toBe(4)
    expect(w.distOverlaps).toHaveLength(3)
  })

  it('Current memo + Kite in summer → 7 in-term, reduction 7', () => {
    const w = computeNCCWorkload(planKiteInSummer(), STANDARD, DEFAULT_VIPER_MODS)
    expect(w.inTermTotalCU).toBe(7)
    expect(w.reductionCU).toBe(7)
    expect(w.meetsGoal).toBe(true)
    // Summer Kite counts toward policy but NOT in-term (the key invariant).
    expect(w.policyTotalCU).toBe(8)
    expect(w.summerOffloadCU).toBe(1)
    expect(w.foundationsInSummerCount).toBe(1)
    expect(w.foundations.find(f => f.id === 'kite')?.status).toBe('summer')
    // Kite still double-counts toward H even when placed in summer.
    expect(w.distSavedCU).toBe(4)
  })

  it('Current memo + 12+0 → 3 in-term, reduction 11', () => {
    // The scenario table is cumulative here: row 4 keeps row 3's Kite-in-summer
    // placement and adds the 12+0 distribution waiver. (Memo + 12+0 WITHOUT the
    // summer Kite is 4 in-term — asserted below.)
    const w = computeNCCWorkload(planKiteInSummer(), ZERO, DEFAULT_VIPER_MODS)
    expect(w.inTermTotalCU).toBe(3)
    expect(w.reductionCU).toBe(11)
    expect(w.meetsGoal).toBe(true)
    expect(w.distNetCU).toBe(0)
    // The baseline is FIXED — 12+0 does not shrink it (CLAUDE.md trap #4).
    expect(w.baselineCU).toBe(14)

    const noSummer = computeNCCWorkload(planNoSummer(), ZERO, DEFAULT_VIPER_MODS)
    expect(noSummer.inTermTotalCU).toBe(4)
    expect(noSummer.reductionCU).toBe(10)
  })

  it('Aggressive + 12+0 → 6 in-term, reduction 8', () => {
    // The documented 6 CU / 8 reduction reproduces under the aggressive preset
    // with the STANDARD 12+5+3 profile: five Foundations are waived (only
    // Writing remains in-term, 1 CU), and waiving Kite FORFEITS its H
    // double-count (the !kite.waived guard), so distribution nets 8 − 3 = 5.
    // 1 + 5 = 6, reduction 8.
    const w = computeNCCWorkload(planNoSummer(), STANDARD, MOD_PRESETS.aggressive.mods)
    expect(w.inTermTotalCU).toBe(6)
    expect(w.reductionCU).toBe(8)
    expect(w.meetsGoal).toBe(true)
    expect(w.foundationInTermCU).toBe(1)
    expect(w.foundationsWaivedCount).toBe(5)
    expect(w.distSavedCU).toBe(3) // Kite overlap forfeited; Writing 1 + VIPR 2
    expect(w.distNetCU).toBe(5)

    // The 12+0 waiver ALONE (no mods) also lands on exactly 6 / 8 — the
    // "aggressive single ask" reading of this row. Asserted so the documented
    // numbers hold under either interpretation.
    const zeroOnly = computeNCCWorkload(planNoSummer(), ZERO, MOD_PRESETS.none.mods)
    expect(zeroOnly.inTermTotalCU).toBe(6)
    expect(zeroOnly.reductionCU).toBe(8)

    // For the record: the LITERAL combination (aggressive preset AND 12+0
    // targets) bottoms out at 1 in-term CU (Writing only) / reduction 13.
    // That does NOT match the documented 6/8 — see porting notes.
    const literal = computeNCCWorkload(planNoSummer(), ZERO, MOD_PRESETS.aggressive.mods)
    expect(literal.inTermTotalCU).toBe(1)
    expect(literal.reductionCU).toBe(13)
  })
})

// ---- Invariants & semantics ----

describe('computeNCCWorkload semantics', () => {
  it('keyWaiver defaults to FALSE (demoted May 2026 — CLAUDE.md trap #5)', () => {
    expect(DEFAULT_VIPER_MODS.keyWaiver).toBe(false)
    const w = computeNCCWorkload(planNoSummer(), STANDARD, DEFAULT_VIPER_MODS)
    expect(w.foundations.find(f => f.id === 'key')?.status).toBe('in-term')
  })

  it('baseline stays 14 regardless of targets or mods', () => {
    for (const targets of [STANDARD, ZERO, { N: 12, SS: 3, H: 2 }]) {
      for (const mods of [MOD_PRESETS.none.mods, DEFAULT_VIPER_MODS, MOD_PRESETS.aggressive.mods]) {
        expect(computeNCCWorkload(planNoSummer(), targets, mods).baselineCU).toBe(14)
      }
    }
  })

  it('detects summer Foundations via userFulfills marks too', () => {
    const plan = mkPlan({
      'summer-y3': [{ code: 'ANTH 0120', title: 'P&D pick', cu: 1, category: 'gened' }],
    })
    // Simulate augmentPlan output: the user marked the course as fulfilling P&D.
    const courses = plan.semesters['summer-y3']
    const withMarks: NCCPlanInput = {
      semesters: { ...plan.semesters, 'summer-y3': (courses ?? []).map(c => ({ ...c, userFulfills: ['ncc-pad'] })) },
    }
    const w = computeNCCWorkload(withMarks, STANDARD, DEFAULT_VIPER_MODS)
    expect(w.foundations.find(f => f.id === 'pad')?.status).toBe('summer')
    expect(w.inTermTotalCU).toBe(7)
    expect(w.policyTotalCU).toBe(8)
  })

  it('waived takes precedence over summer placement', () => {
    // Aggressive waives Kite, so a summer-placed Kite shows waived, not summer,
    // and contributes nothing to summer offload.
    const w = computeNCCWorkload(planKiteInSummer(), STANDARD, MOD_PRESETS.aggressive.mods)
    const kite = w.foundations.find(f => f.id === 'kite')
    expect(kite?.status).toBe('waived')
    expect(kite?.inSummer).toBe(false)
    expect(w.summerOffloadCU).toBe(0)
  })

  it('handles a null/absent plan (no summer detection)', () => {
    const w = computeNCCWorkload(null, STANDARD, DEFAULT_VIPER_MODS)
    expect(w.inTermTotalCU).toBe(8)
    expect(w.summerOffloadCU).toBe(0)
  })

  it('distribution savings never push the net below zero', () => {
    const w = computeNCCWorkload(planNoSummer(), ZERO, DEFAULT_VIPER_MODS)
    expect(w.distGrossCU).toBe(0)
    expect(w.distSavedCU).toBe(4)
    expect(w.distNetCU).toBe(0)
  })

  it('A&S waiver is reported but NOT subtracted from CU totals (verbatim old behavior)', () => {
    const on = computeNCCWorkload(planNoSummer(), STANDARD, DEFAULT_VIPER_MODS)
    const off = computeNCCWorkload(planNoSummer(), STANDARD, { ...DEFAULT_VIPER_MODS, aandsCUWaiver: false })
    expect(on.aandsWaiverSaves).toBe(3)
    expect(off.aandsWaiverSaves).toBe(0)
    expect(on.inTermTotalCU).toBe(off.inTermTotalCU)
  })
})

describe('normalizeViperMods', () => {
  it('undefined / true → copy of current proposal', () => {
    expect(normalizeViperMods(undefined)).toEqual(DEFAULT_VIPER_MODS)
    expect(normalizeViperMods(true)).toEqual(DEFAULT_VIPER_MODS)
    expect(normalizeViperMods(undefined)).not.toBe(DEFAULT_VIPER_MODS)
  })

  it('false (legacy boolean) → all mods off', () => {
    const mods = normalizeViperMods(false)
    expect(Object.values(mods).every(v => v === false)).toBe(true)
  })

  it('partial object → merged over defaults', () => {
    const mods = normalizeViperMods({ keyWaiver: true })
    expect(mods.keyWaiver).toBe(true)
    expect(mods.fysWaiver).toBe(true) // from defaults
    expect(mods.pdWaiver).toBe(false) // from defaults
  })
})

describe('strategy toggles', () => {
  const distribution = STRATEGIES[0]
  const kiteWriting = STRATEGIES.find(s => s.id === 'doubleCountKite')

  it('has the seven sandbox strategies (Miller cap)', () => {
    expect(STRATEGIES.map(s => s.id)).toEqual([
      'distribution', 'aandsCUWaiver', 'doubleCountKite', 'doubleCountVIPR1300',
      'langWaiver', 'kiteLabWaiver', 'keyWaiver',
    ])
  })

  it('12+0 toggle flips between standard and full waiver, mods untouched', () => {
    if (!distribution) throw new Error('missing distribution strategy')
    const mods = normalizeViperMods(undefined)
    expect(isStrategyOn(distribution, mods, STANDARD)).toBe(false)
    const on = toggleStrategy(distribution, mods, STANDARD)
    expect(on.targets).toEqual(ZERO)
    expect(on.mods).toBe(mods)
    expect(isStrategyOn(distribution, mods, on.targets)).toBe(true)
    const back = toggleStrategy(distribution, mods, on.targets)
    expect(back.targets).toEqual(STANDARD)
  })

  it('reduced (3+2) and minimal (3+1) profiles count as "on" and toggle back to standard', () => {
    if (!distribution) throw new Error('missing distribution strategy')
    for (const t of [{ N: 12, SS: 3, H: 2 }, { N: 12, SS: 3, H: 1 }]) {
      const mods = normalizeViperMods(undefined)
      expect(isStrategyOn(distribution, mods, t)).toBe(true)
      expect(toggleStrategy(distribution, mods, t).targets).toEqual(STANDARD)
    }
  })

  it('Kite + Writing pair toggles together and is only "on" when both are set', () => {
    if (!kiteWriting) throw new Error('missing doubleCountKite strategy')
    const halfOn = { ...MOD_PRESETS.none.mods, doubleCountKite: true }
    expect(isStrategyOn(kiteWriting, halfOn, STANDARD)).toBe(false)
    const next = toggleStrategy(kiteWriting, halfOn, STANDARD)
    expect(next.mods.doubleCountKite).toBe(true)
    expect(next.mods.doubleCountWriting).toBe(true)
    expect(isStrategyOn(kiteWriting, next.mods, STANDARD)).toBe(true)
    const off = toggleStrategy(kiteWriting, next.mods, STANDARD)
    expect(off.mods.doubleCountKite).toBe(false)
    expect(off.mods.doubleCountWriting).toBe(false)
  })
})

describe('computeSEASGenElectives', () => {
  it('empty plan, memo defaults → ethics + writing + 2 VIPR 1300 overlaps = 4/7', () => {
    const seas = computeSEASGenElectives(planNoSummer(), DEFAULT_VIPER_MODS)
    expect(seas.total).toBe(7)
    expect(seas.satisfied).toBe(4)
    expect(seas.remaining).toBe(3)
    expect(seas.requirements[0]?.satisfied).toBe(true) // ethics via VIPR 1200/1210
    expect(seas.requirements[1]?.satisfied).toBe(true) // writing via College overlap
  })

  it('without doubleCountVIPR1300 only ethics + writing are covered', () => {
    const seas = computeSEASGenElectives(planNoSummer(), MOD_PRESETS.none.mods)
    expect(seas.satisfied).toBe(2)
    expect(seas.remaining).toBe(5)
  })

  it('College SS/H gen-eds overlap into SEAS SS/H slots (cap 5)', () => {
    const gened = (code: string, distribution: 'SS' | 'H'): PlannedCourse => ({
      code, title: code, cu: 1, category: 'gened', intent: { distribution },
    })
    const plan = mkPlan({
      'fall-y2': [gened('ECON 0100', 'SS'), gened('HIST 1708', 'H')],
      'spring-y2': [gened('SOCI 0001', 'SS'), gened('ENGL 0040', 'H')],
    })
    const seas = computeSEASGenElectives(plan, DEFAULT_VIPER_MODS)
    // 4 College SS/H + 2 VIPR 1300 = 6 overlaps, capped at the 5 SS/H slots.
    expect(seas.satisfied).toBe(7)
    expect(seas.remaining).toBe(0)
  })

  it('Foundation slots (ncc-kite / ncc-pad) without explicit division still count', () => {
    const plan = mkPlan({
      'fall-y2': [{
        code: 'ANTH 0120', title: 'P&D', cu: 1, category: 'gened',
        slotId: 'ncc-pad', intent: { foundation: 'ncc-pad' },
      }],
    })
    const seas = computeSEASGenElectives(plan, MOD_PRESETS.none.mods)
    expect(seas.satisfied).toBe(3) // ethics + writing + the P&D overlap
  })

  it('non-gened courses are ignored', () => {
    const plan = mkPlan({
      'fall-y1': [{ code: 'CHEM 1011', title: 'Chem', cu: 1, category: 'sas' }],
    })
    const seas = computeSEASGenElectives(plan, MOD_PRESETS.none.mods)
    expect(seas.satisfied).toBe(2)
  })
})

// Type-level check: the real Plan shape feeds straight into the NCC math.
describe('Plan compatibility', () => {
  it('accepts a full Plan object', () => {
    const plan: Plan = {
      semesters: { ...emptySemesters(), 'summer-y2': [KITE_COURSE] },
      loads: {
        'fall-y1': 0, 'spring-y1': 0, 'summer-y1': 0,
        'fall-y2': 0, 'spring-y2': 0, 'summer-y2': 1,
        'fall-y3': 0, 'spring-y3': 0, 'summer-y3': 0,
        'fall-y4': 0, 'spring-y4': 0,
      },
      placement: { 'ARTH 0150': 'summer-y2' },
      meta: {},
      notes: [],
    }
    const w = computeNCCWorkload(plan, STANDARD, DEFAULT_VIPER_MODS)
    expect(w.inTermTotalCU).toBe(7)
    expect(computeSEASGenElectives(plan, DEFAULT_VIPER_MODS).total).toBe(7)
  })
})
