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
import { MAJORS } from '../data/majors'
import {
  FOUNDATION_IDS,
  effectiveFulfillments,
  faTag,
  secTag,
  splitMarks,
  type FulfillmentMark,
} from './fulfillments'
import type {
  AugmentedCourse,
  AugmentedPlan,
  FulfillmentIntent,
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
  userPlanFulfillments?: Record<string, readonly FulfillmentMark[]>
  sasMajorKey?: string
  /** Incoming credit ids (a language waiver covers the old core's FL). */
  apCreditIds?: readonly string[]
  /**
   * Which College curriculum the plan is audited under. Stars count only
   * that curriculum's requirements (old-core FA / Sector vs NCC Foundation /
   * division); omitted counts both.
   */
  curriculumMode?: 'legacy' | 'ncc'
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
  const fulfillmentMap: Record<string, readonly FulfillmentMark[]> = {
    ...(userPlan.fulfillments ?? {}),
    ...(ctx.userPlanFulfillments ?? {}),
  }

  // Copy semesters; resolve what each course counts toward (derived from
  // catalog + slot + program rules, then the student's overrides).
  const semesters: Record<string, AugmentedCourse[]> = {}
  for (const k of ALL_SEMS) {
    const courses = rawSemesters[k] ?? []
    semesters[k] = courses.map((c) => {
      const key = c.originalCode || c.code
      const marks = fulfillmentMap[key]
      const { added, removed } = splitMarks(marks)
      const effective = effectiveFulfillments(c, marks)

      // The intent object mirrors the effective Foundation / division so
      // older readers (placement, the LLM digest) see the same picture.
      let intent: FulfillmentIntent | null = c.intent ?? null
      if (added.length > 0 || removed.length > 0) {
        intent = { ...(intent ?? {}) }
        const foundation = FOUNDATION_IDS.find((f) => effective.includes(f))
        if (foundation) intent.foundation = foundation
        else delete intent.foundation
        const marked = added.find((t) => t.startsWith('ncc-distrib-'))
        if (marked) intent.distribution = marked.replace('ncc-distrib-', '').toUpperCase()
        for (const t of removed) {
          if (t.startsWith('ncc-distrib-') && intent.distribution === t.replace('ncc-distrib-', '').toUpperCase()) {
            delete intent.distribution
          }
        }
        const seas = effective
          .filter((t) => t === 'seas-ssh' || t === 'seas-writ' || t === 'seas-ethics' || t === 'seas-tbs')
          .map((t) => t.replace('seas-', '') as NonNullable<FulfillmentIntent['seas']>[number])
        if (seas.length > 0) intent.seas = seas
        else delete intent.seas
      }
      // Catalog energy courses count unless unticked; any course the
      // student ticks counts toward the 3-course requirement.
      const isEnergy = effective.includes('viper-energy')

      // Requirement count for the star display:
      //   cross-degree overlap (category 'both' / 'viper') → gold stars
      //   within-degree extras (FA, Sector, Foundation, division, each
      //   SEAS bucket, energy) → red stars
      let crossDegreeCount = 0
      if (c.category === 'both' || c.category === 'viper') crossDegreeCount = 2
      else if (c.category === 'sas' || c.category === 'seas') crossDegreeCount = 1
      let extraReqs = 0
      const countOldCore = ctx.curriculumMode !== 'ncc'
      const countNcc = ctx.curriculumMode !== 'legacy'
      if (countOldCore && effective.some((t) => t.startsWith('fa:'))) extraReqs += 1
      if (countOldCore && effective.some((t) => t.startsWith('sec:'))) extraReqs += 1
      if (countNcc && effective.some((t) => (FOUNDATION_IDS as readonly string[]).includes(t))) extraReqs += 1
      if (countNcc && effective.some((t) => t.startsWith('ncc-distrib-'))) extraReqs += 1
      extraReqs += effective.filter((t) => t.startsWith('seas-')).length
      if (isEnergy) extraReqs += 1
      const requirementCount = crossDegreeCount + extraReqs
      const overlapKind =
        c.category === 'both' || c.category === 'viper'
          ? ('overlap' as const) // gold stars — cross-degree
          : extraReqs >= 1
            ? ('within-degree' as const) // red stars — within one degree
            : null

      return {
        ...c,
        intent,
        isEnergy,
        userFulfills: added,
        effectiveFulfills: effective,
        removedFulfills: removed,
        requirementCount,
        overlapKind,
      }
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

  // Old-core FA + Sector fulfillment, from what each course counts toward
  // (catalog attributes included). The College major auto-completes its
  // Sector, and a language waiver from incoming credit covers FL.
  const allCourses: AugmentedCourse[] = ALL_SEMS.flatMap((k) => semesters[k] ?? [])
  const autoSector = ctx.sasMajorKey ? (MAJORS[ctx.sasMajorKey]?.autoSector ?? null) : null
  const langCredit = (ctx.apCreditIds ?? []).includes('lang-fluency')
  for (const fa of FA_REQUIREMENTS) {
    const hit = (fa.id === 'FL' && langCredit) || allCourses.some((c) => c.effectiveFulfills.includes(faTag(fa.id)))
    if (hit) summary.fulfilledFA.push(fa.id)
    else summary.unfulfilledFA.push(fa.id)
  }
  for (const sec of SECTORS) {
    const hit = sec.id === autoSector || allCourses.some((c) => c.effectiveFulfills.includes(secTag(sec.id)))
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
