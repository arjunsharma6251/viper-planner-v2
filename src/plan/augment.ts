// Port of the old app's augmentPlan (references/old-app/index.html, ~line 4665).
//
// Takes the user-owned plan {semesters: {fall-y1: [...], ...}} and adds
// the summary/loads/etc. that the scheduler used to compute. Pure
// function — no state, no side effects.
//
// This is what closes the gap left by retiring the scheduler. The
// scheduler used to compute these on the way to building the plan; now
// we compute them from the plan itself.

import { ALL_SEMESTER_KEYS, type SemesterKey } from '../data/semesters'
import { FA_REQUIREMENTS, SECTORS } from '../data/requirements'
import { VIPER_PROGRAM } from '../data/viper-program'
import type {
  AugmentedCourse,
  AugmentedPlan,
  FulfillmentIntent,
  FulfillmentTag,
  Plan,
  PlanSummary,
  PlannedCourse,
} from './types'

/**
 * Context handed to augmentPlan. Carried through as `meta` on the result
 * (the old app passed its whole ctx object straight through).
 */
export interface AugmentPlanContext {
  /**
   * Course key (originalCode || code) → user fulfillment marks.
   * Merged over (and taking precedence over) `plan.fulfillments`.
   */
  userPlanFulfillments?: Record<string, readonly FulfillmentTag[]>
  sasMajorKey?: string
  seasMajorKey?: string
  gradYear?: number | null
  viperMods?: Record<string, boolean> | null
  distributionTargets?: { N: number; SS: number; H: number }
}

// Load classification thresholds — same tiers as the scheduler:
//   ≤ 5.5 CU       — normal
//   5.5 < CU ≤ 6.5 — dual-degree overload (expected for VIPER, still needs form)
//   6.5 < CU ≤ 7.5 — advisor approval required
//   > 7.5 CU       — exceeds Penn's university-wide hard cap
const TARGET_MAX = 6.5
const TARGET_HARD_CAP = 7.5

export function augmentPlan(
  userPlan: Plan | null | undefined,
  ctx: AugmentPlanContext = {},
): AugmentedPlan | null {
  if (!userPlan || !userPlan.semesters) return null
  // Iterate over all known semesters AND any extras the user might have added
  const rawSemesters = userPlan.semesters as Record<string, PlannedCourse[] | undefined>
  const ALL_SEMS = [...new Set<string>([...ALL_SEMESTER_KEYS, ...Object.keys(rawSemesters)])]
  const fulfillmentMap: Record<string, readonly FulfillmentTag[]> = {
    ...(userPlan.fulfillments ?? {}),
    ...(ctx.userPlanFulfillments ?? {}),
  }

  // First, copy semesters and inject user-marked fulfillments
  const semesters: Record<string, AugmentedCourse[]> = {}
  for (const k of ALL_SEMS) {
    const courses = rawSemesters[k] ?? []
    semesters[k] = courses.map((c) => {
      const key = c.originalCode || c.code
      const userMarks: FulfillmentTag[] = [...(fulfillmentMap[key] ?? [])]

      // Build an intent object aggregating the user's marks (only if there are any)
      let intent: FulfillmentIntent | null = c.intent ?? null
      if (userMarks.length > 0) {
        intent = { ...(intent ?? {}) }
        for (const id of userMarks) {
          if (id.startsWith('ncc-distrib-')) {
            intent.distribution = id.replace('ncc-distrib-', '').toUpperCase()
          } else if (id === 'ncc-kite') intent.foundation = 'ncc-kite'
          else if (id === 'ncc-key') intent.foundation = 'ncc-key'
          else if (id === 'ncc-fys') intent.foundation = 'ncc-fys'
          else if (id === 'ncc-writ') intent.foundation = 'ncc-writ'
          else if (id === 'ncc-pad') intent.foundation = 'ncc-pad'
          else if (id === 'ncc-lang') intent.foundation = 'ncc-lang'
          else if (id === 'seas-ssh') intent.seas = [...(intent.seas ?? []), 'ssh']
          else if (id === 'seas-writ') intent.seas = [...(intent.seas ?? []), 'writ']
          else if (id === 'seas-ethics') intent.seas = [...(intent.seas ?? []), 'ethics']
          else if (id === 'seas-tbs') intent.seas = [...(intent.seas ?? []), 'tbs']
        }
      }
      // A student can mark any course as VIPER energy-designated; it then
      // counts toward the 3-course requirement exactly like a catalog flag.
      const isEnergy = !!c.isEnergy || userMarks.includes('viper-energy')

      // Compute requirement count for star display:
      //   "Overlap" = counts toward both BA and BSE (cross-degree contribution)
      //   "Double-count" = satisfies multiple requirements within one degree
      //   "Triple-count" = three or more
      //
      // We count distinct kinds of contribution:
      //   - cross-degree overlap (category === 'both' OR 'viper')   → +1 BA + 1 BSE = 2
      //   - within-degree extras: FA, sector, foundation, distribution, SEAS slot, energy
      let crossDegreeCount = 0
      if (c.category === 'both' || c.category === 'viper') crossDegreeCount = 2
      else if (c.category === 'sas' || c.category === 'seas') crossDegreeCount = 1
      let extraReqs = 0
      const fa = c.fa || c.fulfills?.fa || intent?.fa
      const sec = c.sec || c.fulfills?.sec || intent?.sec
      if (fa) extraReqs += 1
      if (sec) extraReqs += 1
      if (intent?.foundation) extraReqs += 1
      if (intent?.distribution) extraReqs += 1
      if (intent?.seas?.length) extraReqs += intent.seas.length
      if (isEnergy) extraReqs += 1
      const requirementCount = crossDegreeCount + extraReqs
      const overlapKind =
        c.category === 'both' || c.category === 'viper'
          ? ('overlap' as const) // gold stars — cross-degree
          : extraReqs >= 1
            ? ('within-degree' as const) // red stars — within one degree
            : null

      return { ...c, intent, isEnergy, userFulfills: userMarks, requirementCount, overlapKind }
    })
  }

  const summary: PlanSummary = {
    totalCU: 0,
    sasCU: 0,
    seasCU: 0,
    energyCoursesCount: 0,
    doubleCountedCodes: [],
    meetsDualMin: false,
    meetsEnergyReq: false,
    fulfilledFA: [],
    unfulfilledFA: [],
    fulfilledSec: [],
    unfulfilledSec: [],
    overloadSemesters: [],
    approvalSemesters: [],
    exceedsMaxSemesters: [],
    exceedsMaxCourses: [],
  }
  const loads: Record<string, number> = {}
  for (const k of ALL_SEMS) loads[k] = 0

  // CU totals + load classification
  for (const k of ALL_SEMS) {
    const courses = semesters[k] ?? []
    let sem = 0
    for (const c of courses) {
      sem += c.cu || 0
      summary.totalCU += c.cu || 0
      if (
        c.category === 'sas' ||
        c.category === 'both' ||
        c.category === 'viper' ||
        c.category === 'gened'
      ) {
        summary.sasCU += c.cu || 0
      }
      if (c.category === 'seas' || c.category === 'both' || c.category === 'viper') {
        summary.seasCU += c.cu || 0
      }
      if (c.isEnergy) summary.energyCoursesCount += 1
      if (c.isDouble) summary.doubleCountedCodes.push(c.originalCode || c.code)
      if (c.tags && c.tags.includes('EXCEEDS-MAX')) {
        summary.exceedsMaxCourses.push(c.originalCode || c.code)
      }
    }
    loads[k] = sem
    if (sem > TARGET_HARD_CAP) summary.exceedsMaxSemesters.push(k as SemesterKey)
    else if (sem > TARGET_MAX) summary.approvalSemesters.push(k as SemesterKey)
    else if (sem > 5.5) summary.overloadSemesters.push(k as SemesterKey)
  }

  summary.meetsDualMin = summary.totalCU >= (VIPER_PROGRAM.minTotalCU || 40)
  summary.meetsEnergyReq = summary.energyCoursesCount >= 3

  // FA + Sector fulfillment — derived from course tags
  const allCourses: AugmentedCourse[] = ALL_SEMS.flatMap((k) => semesters[k] ?? [])
  for (const fa of FA_REQUIREMENTS) {
    const hit = allCourses.some((c) => c.fulfills?.fa === fa.id || c.intent?.fa === fa.id)
    if (hit) summary.fulfilledFA.push(fa.id)
    else summary.unfulfilledFA.push(fa.id)
  }
  for (const sec of SECTORS) {
    const hit = allCourses.some((c) => c.fulfills?.sec === sec.id || c.intent?.sec === sec.id)
    if (hit) summary.fulfilledSec.push(sec.id)
    else summary.unfulfilledSec.push(sec.id)
  }

  // Build a `placement` lookup (course code → semKey) so legacy helpers
  // like electivesForSlot can introspect what's already placed.
  // (CLAUDE.md common trap #3: this map MUST exist on the result.)
  const placement: Record<string, string> = {}
  for (const [k, courses] of Object.entries(semesters)) {
    for (const c of courses) {
      const code = c.originalCode || c.code
      if (code) placement[code] = k
    }
  }

  return { semesters, loads, summary, placement, meta: ctx, notes: [] }
}
