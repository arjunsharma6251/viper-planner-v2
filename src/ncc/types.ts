// NCC (New Core Curriculum) types — derived from actual usage in the old
// app's NCC section (references/old-app/index.html, ~lines 3684–4350).
// These are ncc-local: the shared plan types (src/plan/types.ts) don't model
// the sandbox's mod flags, workload result, or strategy list.

import type { CourseCategory, FulfillmentIntent } from '../plan/types'

// ---- VIPER modification flags ----
// Granular flags for the curriculum-committee sandbox. Each flag represents
// one specific modification to the standard NCC. (Old DEFAULT_VIPER_MODS keys.)
export interface ViperMods {
  // — Foundation waivers via VIPR courses —
  fysWaiver: boolean
  keyWaiver: boolean
  // — Full Foundation waivers —
  langWaiver: boolean
  pdWaiver: boolean
  kiteFullWaiver: boolean
  viprKiteWaiver: boolean
  // — Course modifications (keep course, reduce load) —
  kiteLabWaiver: boolean
  summerFoundation: boolean
  // — Double-counting rules —
  doubleCountVIPR1300: boolean
  doubleCountKite: boolean
  doubleCountWriting: boolean
  // — SEAS attribute —
  seasHumanitiesKite: boolean
  // — CU waivers —
  aandsCUWaiver: boolean
}

export type ViperModKey = keyof ViperMods

/**
 * Accepted input wherever mods flow in. The old app stored a legacy boolean
 * (`viperModsEnabled`) before the granular flags existed; normalizeViperMods
 * accepts boolean, partial object, or nothing.
 */
export type ViperModsInput = boolean | Partial<ViperMods> | null | undefined

// ---- Mod metadata ----
// Ask ratings reflect how invasive the modification is to the standard College
// curriculum: 'low' = routine accommodation, 'medium' = needs justification,
// 'high' = waives a politically significant requirement. 'confirmed' = already
// approved policy.
export type AskLevel = 'confirmed' | 'low' | 'medium' | 'high'

export type ModCategory =
  | 'Foundation waivers'
  | 'Course modifications'
  | 'Double-counting'
  | 'Other'

export interface ModDefinition {
  label: string
  desc: string
  category: ModCategory
  ask: AskLevel
  /** Whether this mod is in the current VIPER modification memo. */
  proposed: boolean
  /** Approximate CU saved (0 = redistributes load without reducing courses). */
  saves: number
}

/** Preset bundle — each represents a scenario to compare. */
export interface ModPreset {
  label: string
  desc: string
  mods: ViperMods
}

// ---- Distribution targets ----
// NCC distribution assignment. Standard is 12+5+3 (N fully covered by the
// engineering major; SS + H are the student-facing CU).
export interface DistributionTargets {
  N: number
  SS: number
  H: number
}

// ---- Workload (computeNCCWorkload) ----

/** Short Foundation keys used inside the workload math ('kite', not 'ncc-kite'). */
export type NCCFoundationKey = 'kite' | 'key' | 'fys' | 'writ' | 'pad' | 'lang'

/**
 * Each Foundation has three possible states:
 *   - waived  (mod toggle removes it entirely from the requirement)
 *   - summer  (still required for policy, but completed in a summer term —
 *              counts toward policy CU but not in-term CU)
 *   - in-term (active, counted both ways)
 */
export type FoundationStatus = 'waived' | 'summer' | 'in-term'

export interface FoundationWorkload {
  id: NCCFoundationKey
  label: string
  cu: number
  waived: boolean
  waivedBy: string | null
  inSummer: boolean
  /** For display: take precedence — waived > summer > in-term. */
  status: FoundationStatus
}

/** A double-count overlap reducing the distribution requirement. */
export interface DistOverlap {
  from: string
  toward: 'SS' | 'H'
  cu: number
}

export interface WorkloadResult {
  foundations: FoundationWorkload[]
  // Split: policy vs in-term
  foundationPolicyCU: number
  foundationInTermCU: number
  foundationSummerCU: number
  /** Legacy field kept for backward compat (= policy total). */
  foundationCU: number
  foundationsWaivedCount: number
  foundationsInSummerCount: number
  distGrossCU: number
  distSavedCU: number
  distNetCU: number
  distOverlaps: DistOverlap[]
  ssTarget: number
  hTarget: number
  aandsWaiverSaves: number
  /** Backward compat — this is what the headline shows (= in-term total). */
  totalCU: number
  /** What the student must complete to graduate (summers count). */
  policyTotalCU: number
  /** What the student carries during the academic year (summers don't). */
  inTermTotalCU: number
  summerOffloadCU: number
  /** FIXED at 14 (6 Foundations + 5+3 distribution). Never derived from targets. */
  baselineCU: number
  reductionCU: number
  goalReductionMin: number
  goalReductionMax: number
  meetsGoal: boolean
}

// ---- SEAS gen electives (computeSEASGenElectives) ----

export interface SEASGenElectiveSlot {
  id: string
  label: string
  fillsByVIPR?: boolean
  fillsByCollegeWrit?: boolean
  filledBy?: string
  satisfied: boolean
}

export interface SEASGenElectivesResult {
  requirements: SEASGenElectiveSlot[]
  total: number
  satisfied: number
  remaining: number
  // Per Michelle: SEAS untouched, overlaps allowed. With current mods,
  // most or all SEAS slots are covered by College work.
}

// ---- Plan input ----
// Structural subset of what the NCC math actually reads from a plan, so both
// Plan (src/plan/types.ts) and AugmentedPlan satisfy it. PlannedCourse lacks
// `userFulfills` (it's added by augmentPlan) — modelled here as an optional
// readonly string[] so either shape type-checks.
export interface NCCCourseInput {
  code?: string
  cu?: number
  category?: CourseCategory
  slotId?: string
  intent?: FulfillmentIntent | null
  userFulfills?: readonly string[]
}

export interface NCCPlanInput {
  semesters: Partial<Record<string, readonly NCCCourseInput[]>>
}

// ---- Strategies (the sandbox's seven toggles) ----

interface StrategyBase {
  label: string
  desc: string
  ask: AskLevel
}

/** The 12+5+3 → 12+0 row — toggles distribution TARGETS, not a mod flag. */
export interface DistributionStrategy extends StrategyBase {
  id: 'distribution'
  isStrategy: true
  type: 'distribution'
  pairWith?: undefined
}

/** A strategy backed by one (or a pair of) ViperMods flags. */
export interface ModStrategy extends StrategyBase {
  id: ViperModKey
  type?: undefined
  /** Flags toggled together with `id` (e.g. doubleCountKite + doubleCountWriting). */
  pairWith?: readonly ViperModKey[]
}

export type Strategy = DistributionStrategy | ModStrategy
