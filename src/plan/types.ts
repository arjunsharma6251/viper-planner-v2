// Core plan types shared by the scheduler (seed generation), the plan
// mutation API, the NCC math, and the UI. Derived from the old app's plan
// shape (references/old-app/index.html, SECTION 2 header comment and
// augmentPlan). Extend with OPTIONAL fields only — scheduler and NCC code
// imports these types and must keep compiling.

import type { FaId, SectorId } from '../data/types'
import type { SemesterKey } from '../data/semesters'

/** Where a course's CU counts: BA (sas), BSE (seas), both, VIPER program, gen-ed. */
export type CourseCategory = 'sas' | 'seas' | 'both' | 'viper' | 'gened'

/** Marker tags attached to a planned course by edits ('MOVED', 'EXCEEDS-MAX'). */
export type CourseTag = 'MOVED' | 'EXCEEDS-MAX'

/** NCC Foundation ids. */
export type FoundationId =
  | 'ncc-kite'
  | 'ncc-key'
  | 'ncc-fys'
  | 'ncc-writ'
  | 'ncc-pad'
  | 'ncc-lang'

/** SEAS gen-ed buckets a course can be marked toward. */
export type SeasBucket = 'ssh' | 'writ' | 'ethics'

/** User-markable fulfillment ids (the checkbox list in the detail modal). */
export type FulfillmentTag =
  | FoundationId
  | 'ncc-distrib-ss'
  | 'ncc-distrib-h'
  | 'ncc-distrib-n'
  | 'seas-ssh'
  | 'seas-writ'
  | 'seas-ethics'

/** What a course is intended to satisfy (from slot defs or user marks). */
export interface FulfillmentIntent {
  fa?: FaId
  sec?: SectorId
  foundation?: FoundationId
  /** Distribution bucket: 'SS' | 'H' | 'N' (uppercased from ncc-distrib-*). */
  distribution?: string
  seas?: SeasBucket[]
}

/** What a course structurally fulfills (looked up from catalog/slot data). */
export interface Fulfills {
  fa?: FaId | null
  sec?: SectorId | null
}

/**
 * A course as it sits in a plan semester. Superset of the catalog entry —
 * the scheduler and user edits attach placement-specific state.
 */
export interface PlannedCourse {
  code: string
  title: string
  cu: number
  category?: CourseCategory
  /** Elective/gen-ed slot this line came from (swappable via picker). */
  slotId?: string
  label?: string
  /** Set when the user renames/swaps; preserves identity for fulfillment marks. */
  originalCode?: string
  fulfills?: Fulfills
  intent?: FulfillmentIntent | null
  isEnergy?: boolean
  /** Within-degree double-count (red stars). */
  isDouble?: boolean
  isElective?: boolean
  isPlaceholder?: boolean
  /** Locked in the plan (VIPR 1300 in summer-y1) — cannot be deleted. */
  fixed?: boolean
  tags?: CourseTag[]
  note?: string | null
}

/** A planned course after augmentPlan adds display-layer computed fields. */
export interface AugmentedCourse extends PlannedCourse {
  userFulfills: FulfillmentTag[]
  /** Distinct requirement contributions — drives the star indicator (cap 3). */
  requirementCount: number
  /** 'overlap' = cross-degree (gold), 'within-degree' = double-count (red). */
  overlapKind: 'overlap' | 'within-degree' | null
}

export interface PlanSummary {
  totalCU: number
  sasCU: number
  seasCU: number
  energyCoursesCount: number
  doubleCountedCodes: string[]
  meetsDualMin: boolean
  meetsEnergyReq: boolean
  fulfilledFA: FaId[]
  unfulfilledFA: FaId[]
  fulfilledSec: SectorId[]
  unfulfilledSec: SectorId[]
  /** Load > 5.5 CU (dual overload, allowed but tight). */
  overloadSemesters: SemesterKey[]
  /** Load > 6.5 CU (needs approval). */
  approvalSemesters: SemesterKey[]
  /** Load > 7.5 CU (hard cap exceeded). */
  exceedsMaxSemesters: SemesterKey[]
  exceedsMaxCourses: string[]
}

export interface PlanMeta {
  sasMajor?: string
  sasConc?: string
  seasMajor?: string
  seasConc?: string
  gradYear?: number | null
  overrides?: Record<string, unknown>
  creditFlags?: Record<string, boolean>
}

/** Course code → where it sits ('credit' = satisfied by AP/placement credit). */
export type PlacementMap = Record<string, SemesterKey | 'credit'>

/**
 * The plan. `semesters` MUST contain all 11 keys (8 in-term + 3 summer) —
 * see CLAUDE.md "Common traps" #2.
 */
export interface Plan {
  semesters: Record<SemesterKey, PlannedCourse[]>
  loads: Record<SemesterKey, number>
  placement: PlacementMap
  meta: PlanMeta
  notes: string[]
  summary?: PlanSummary
}

/** An augmented plan (augmentPlan output) — always has summary + placement. */
export interface AugmentedPlan {
  semesters: Record<string, AugmentedCourse[]>
  loads: Record<string, number>
  placement: Record<string, string>
  summary: PlanSummary
  meta: unknown
  notes: string[]
}

// ---- Mutations (the internal API; LLM tools mirror these) ----

export interface CourseDraft {
  code: string
  title?: string
  cu?: number
  category?: CourseCategory
}

export type Mutation =
  | { kind: 'add_course'; semester: SemesterKey; course: CourseDraft }
  | { kind: 'remove_course'; semester: SemesterKey; courseId: string }
  | {
      kind: 'move_course'
      from: SemesterKey
      to: SemesterKey
      courseId: string
      targetIndex?: number
    }
  | { kind: 'tag_fulfillment'; courseId: string; fulfillmentId: FulfillmentTag; on: boolean }
  | { kind: 'swap_elective'; slotId: string; newCode: string }
  | { kind: 'rename_course'; courseId: string; newCode: string }

export interface MutationResult {
  ok: boolean
  /** Human-readable outcome ("Removed CHEM 2410") or error reason. */
  message: string
  plan: Plan
}
