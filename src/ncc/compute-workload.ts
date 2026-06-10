// Ported verbatim from references/old-app/index.html (~lines 3948–4088).

import { SUMMER_KEYS } from '../data/semesters'
import { normalizeViperMods } from './mods'
import type {
  DistOverlap,
  DistributionTargets,
  FoundationWorkload,
  NCCFoundationKey,
  NCCPlanInput,
  ViperModsInput,
  WorkloadResult,
} from './types'

/**
 * Policy-level NCC workload. This is the view we use for the Michelle-aligned
 * sandbox: how many CU of "non-major" work does the student actually do under
 * a given mod configuration, broken into Foundations + Distribution.
 *
 * Per Michelle's framing (May '26):
 *   Foundations alone = 5–7 CU baseline
 *     Kite (1) + Key (1) + FYS (1) + Writing (1) + P&D (1) + Lang (0–2)
 *   Distribution beyond Foundations = (targets.SS + targets.H) CU
 *     (Natural Sciences target is fully covered by majors; not user work.)
 *   Total non-major CU = Foundations + Distribution-not-overlapping-Foundations
 *   Mods reduce this by waiving Foundations, double-counting, or overlapping
 *   into the distribution targets.
 */
export function computeNCCWorkload(
  plan: NCCPlanInput | null | undefined,
  targets: DistributionTargets,
  viperMods?: ViperModsInput,
): WorkloadResult {
  const mods = normalizeViperMods(viperMods)

  // ---- Scan the plan for summer-placed Foundations ----
  // A Foundation is "offloaded to summer" when the user has placed a course
  // in a summer-y* semester AND marked it as fulfilling that Foundation.
  // This is the placement-based mechanism; it replaces the older mod-toggle
  // approach for kiteLabWaiver / summerFoundation.
  const summerFoundationsSatisfied = new Set<NCCFoundationKey>() // e.g. 'kite', 'key'
  if (plan && plan.semesters) {
    for (const sk of SUMMER_KEYS) {
      const courses = plan.semesters[sk] || []
      for (const c of courses) {
        // Detect via slotId, intent.foundation, or userFulfills marks
        const tags = c.userFulfills || []
        if (c.intent?.foundation === 'ncc-kite' || tags.includes('ncc-kite')) summerFoundationsSatisfied.add('kite')
        if (c.intent?.foundation === 'ncc-key'  || tags.includes('ncc-key'))  summerFoundationsSatisfied.add('key')
        if (c.intent?.foundation === 'ncc-fys'  || tags.includes('ncc-fys'))  summerFoundationsSatisfied.add('fys')
        if (c.intent?.foundation === 'ncc-writ' || tags.includes('ncc-writ')) summerFoundationsSatisfied.add('writ')
        if (c.intent?.foundation === 'ncc-pad'  || tags.includes('ncc-pad'))  summerFoundationsSatisfied.add('pad')
        if (c.intent?.foundation === 'ncc-lang' || tags.includes('ncc-lang')) summerFoundationsSatisfied.add('lang')
      }
    }
  }

  // ---- Foundations ----
  // Each Foundation has three possible states:
  //   - waived  (mod toggle removes it entirely from the requirement)
  //   - summer  (still required for policy, but completed in a summer term —
  //              counts toward policy CU but not in-term CU)
  //   - in-term (active, counted both ways)
  const mkFoundation = (
    id: NCCFoundationKey,
    label: string,
    waivedFlag: boolean,
    waivedBy: string | null,
  ): FoundationWorkload => {
    const inSummer = summerFoundationsSatisfied.has(id)
    return {
      id, label, cu: 1,
      waived: !!waivedFlag,
      waivedBy: waivedFlag ? waivedBy : null,
      inSummer: inSummer && !waivedFlag,
      // For display: take precedence — waived > summer > in-term
      status: waivedFlag ? 'waived' : (inSummer ? 'summer' : 'in-term'),
    }
  }

  const kiteFoundation = mkFoundation(
    'kite', 'Kite',
    mods.kiteFullWaiver || mods.viprKiteWaiver,
    mods.viprKiteWaiver ? 'VIPR 1300' : 'committee waiver',
  )
  const foundations: FoundationWorkload[] = [
    kiteFoundation,
    mkFoundation('key',  'Key',                  mods.keyWaiver,  'VIPR 1200/1210'),
    mkFoundation('fys',  'First-Year Seminar',   mods.fysWaiver,  'VIPR 1200/1210'),
    mkFoundation('writ', 'Writing Seminar',      false, null),
    mkFoundation('pad',  'Perspectives & Diff.', mods.pdWaiver,   'VIPR 1300'),
    mkFoundation('lang', 'Foreign Language',     mods.langWaiver, 'committee waiver'),
  ]

  // Policy CU: every non-waived Foundation counts (whether summer or in-term)
  const foundationPolicyCU = foundations.reduce((s, f) => s + (f.waived ? 0 : f.cu), 0)
  // In-term CU: subtract summer-offloaded too
  const foundationInTermCU = foundations.reduce((s, f) => s + ((f.waived || f.inSummer) ? 0 : f.cu), 0)
  // Summer offload: just the summer ones
  const foundationSummerCU = foundations.reduce((s, f) => s + (f.inSummer ? f.cu : 0), 0)

  // ---- Distribution (5+3 = 8 baseline, configurable via targets) ----
  const ssTarget = targets.SS
  const hTarget  = targets.H
  const distGrossCU = ssTarget + hTarget

  let distSavedCU = 0
  const distOverlaps: DistOverlap[] = []
  if (mods.doubleCountKite && !kiteFoundation.waived) {
    distSavedCU += 1
    distOverlaps.push({ from: 'Kite Foundation', toward: 'H', cu: 1 })
  }
  if (mods.doubleCountWriting) {
    distSavedCU += 1
    distOverlaps.push({ from: 'Writing Foundation', toward: 'H', cu: 1 })
  }
  if (mods.doubleCountVIPR1300) {
    distSavedCU += 2
    distOverlaps.push({ from: 'VIPR 1300 (2 of 2.5 CU)', toward: 'SS', cu: 2 })
  }

  const distNetCU = Math.max(0, distGrossCU - distSavedCU)

  // ---- A&S CU waiver ----
  const aandsWaiverSaves = mods.aandsCUWaiver ? 3 : 0

  // ---- Totals ----
  // Policy total: what the student must complete to graduate (summers count).
  // In-term total: what the student carries during the academic year (summers don't).
  // The "Meets 4-6 CU reduction goal" check is against in-term CU per Michelle's
  // framing of "reducing the academic-year burden."
  const policyTotalCU = foundationPolicyCU + distNetCU
  const inTermTotalCU = foundationInTermCU + distNetCU
  const summerOffloadCU = foundationSummerCU

  // The baseline is FIXED — the unreduced NCC policy (6 Foundations + 5+3
  // distribution). Toggles never change it; they show progress against it.
  const baselineCU = 14
  const reductionCU = baselineCU - inTermTotalCU

  return {
    foundations,
    // New split: policy vs in-term
    foundationPolicyCU,
    foundationInTermCU,
    foundationSummerCU,
    // Legacy field kept for backward compat (= policy total)
    foundationCU: foundationPolicyCU,
    foundationsWaivedCount: foundations.filter(f => f.waived).length,
    foundationsInSummerCount: foundations.filter(f => f.inSummer).length,
    distGrossCU,
    distSavedCU,
    distNetCU,
    distOverlaps,
    ssTarget,
    hTarget,
    aandsWaiverSaves,
    // Headline totals: in-term is the goal metric
    totalCU: inTermTotalCU, // for backward compat (this is what the headline shows)
    policyTotalCU,
    inTermTotalCU,
    summerOffloadCU,
    baselineCU,
    reductionCU,
    goalReductionMin: 4,
    goalReductionMax: 6,
    meetsGoal: reductionCU >= 4,
  }
}
