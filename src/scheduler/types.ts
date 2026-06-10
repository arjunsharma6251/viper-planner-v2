// Scheduler-specific types. Ported from references/old-app/index.html,
// SECTION 2: SCHEDULER MODULE (lines ~1528-2850). The old module worked on
// loosely-typed objects; these types describe exactly what the old code read
// and wrote — no semantic changes.
//
// NOTE — gaps vs the shared contract in src/plan/types.ts (which we must not
// edit). Where the shared types were too narrow for the old scheduler's plan
// shape, scheduler-local types below extend (or, where structurally
// incompatible, mirror) them:
//   • Plan.notes is string[] there; the old scheduler pushes structured
//     { level, src, text } notes → PlanNote / SchedulerPlan.notes.
//   • PlanMeta only carries major *keys*; the old scheduler stores resolved
//     Major/Concentration objects plus a dozen stage-computed fields
//     (coreCodes, doubleCounted, fulfilledFA/Sec, preferredSem, …), and
//     creditFlags is a Set, not Record<string, boolean> → SchedulerPlanMeta.
//   • PlannedCourse.tags is limited to 'MOVED' | 'EXCEEDS-MAX'; the scheduler
//     emits 'VIPER', 'DC', 'SAS', 'SEAS', 'ENERGY', 'FA:*', 'SEC:*', 'TIGHT',
//     'Gen-Ed', 'CUSTOM', 'FREE', 'VIPER-req', 'SEAS SS/H' as well
//     → SchedulerCourse.tags: string[].
//   • PlannedCourse lacks warning, slotLabel, placeholderCode, isGenEd,
//     fulfillsDesc, suggests, pool, and the catalog fields carried along by
//     `...courseEntry(code)` spreads (off, prereqs, coreqs, fa, sec, energy,
//     isThermo, isWritSem) → SchedulerCourse.
//   • PlanSummary lacks sasMinRequired, seasMinRequired, meetsSASMin,
//     meetsSEASMin, semesterLoads, heavySemesters, ncc; and its
//     exceedsMaxCourses is string[] where the old summary builds
//     { sem, code, title, cu } objects → SchedulerSummary.

import type {
  Concentration,
  FaId,
  Major,
  Offering,
  SectorId,
} from '../data/types';
import type { SemesterKey } from '../data/semesters';
import type {
  FoundationId,
  Plan,
  PlannedCourse,
  PlanSummary,
} from '../plan/types';

// ---- Plan notes ----

/** Structured advisory note attached to the plan (old plan.notes entries). */
export interface PlanNote {
  level: 'info' | 'warning' | 'policy';
  src: string;
  text: string;
}

// ---- Build options ----

/** NCC distribution CU targets (12+5+3 assignment). */
export interface DistributionTargets {
  N: number;
  SS: number;
  H: number;
}

export type CurriculumMode = 'legacy' | 'ncc';
export type GenedDistribution = 'frontload' | 'penn';

/**
 * Granular VIPER modification flags (NCC mode). The canonical shape (and
 * defaults) live in the NCC module's DEFAULT_VIPER_MODS; the scheduler only
 * reads the flags below, so everything is optional.
 */
export interface ViperMods {
  fysWaiver?: boolean;
  keyWaiver?: boolean;
  langWaiver?: boolean;
  pdWaiver?: boolean;
  kiteFullWaiver?: boolean;
  viprKiteWaiver?: boolean;
  kiteLabWaiver?: boolean;
  summerFoundation?: boolean;
  doubleCountVIPR1300?: boolean;
  doubleCountKite?: boolean;
  doubleCountWriting?: boolean;
  [flag: string]: boolean | undefined;
}

/** Options accepted by buildPlan (old buildPlan @param docs, line ~2665). */
export interface BuildPlanOptions {
  /** e.g., 'PHYS' */
  sasMajorKey: string;
  /** e.g., 'PTET' (optional) */
  sasConcKey?: string | null;
  /** e.g., 'MSE' */
  seasMajorKey: string;
  /** e.g., 'ENERGY' (optional) */
  seasConcKey?: string | null;
  apCreditIds?: readonly string[];
  /** { slotId: courseCode } */
  electiveOverrides?: Record<string, string>;
  customPlacements?: Record<string, string>;
  /** Course codes / slotIds explicitly removed by user. */
  deletedCourses?: readonly string[];
  curriculumMode?: CurriculumMode;
  /** NCC mode: granular modification flags object. */
  viperMods?: ViperMods | boolean | null;
  /** BACKWARD COMPAT: legacy boolean. */
  viperModsEnabled?: boolean;
  /** Shift courses earlier when AP credits free up space. */
  shiftForward?: boolean;
  /** NCC: 12+5+3 assignment. */
  distributionTargets?: DistributionTargets;
  /** 'frontload' (VIPER default) | 'penn' (back-loaded, single-degree style). */
  genedDistribution?: GenedDistribution;
  /** Used for graduating-class-dependent credit policies (e.g. AP Calc BC). */
  gradYear?: number | null;
}

// ---- Concentrations ----

/** A concentration resolved by resolveConcentration (adds its dict key). */
export interface ResolvedConcentration extends Omit<Concentration, 'electiveSlots'> {
  _key: string | null;
  electiveSlots: SchedulerElectiveSlotDef[];
}

/**
 * An elective slot as the scheduler reads it. Extends the data layer's
 * ElectiveSlot fields with `suggested` (referenced by placeOneElective's
 * code-extraction fallback — no current data defines it, kept verbatim).
 */
export interface SchedulerElectiveSlotDef {
  id: string;
  label: string;
  cu?: number;
  pool?: readonly string[];
  energy?: boolean;
  note?: string;
  suggested?: string;
}

/** An elective slot annotated with its school of origin (placeElectives). */
export interface SchedulerElectiveSlot extends SchedulerElectiveSlotDef {
  from: 'SAS' | 'SEAS';
}

// ---- Gen-ed slots ----

/** What a gen-ed slot fulfills (OCC fa/sec, NCC foundation/distribution). */
export interface SlotIntent {
  fa?: FaId;
  sec?: SectorId;
  foundation?: FoundationId;
  /** Distribution bucket: 'SS' | 'H' | 'N'. */
  distribution?: string;
}

/**
 * A gen-ed slot as placeGenEd consumes it — covers both the legacy
 * GENED_SLOTS entries and the NCC slot set (incl. slots the stage
 * synthesizes: standalone FYS/Key/Language and distribution fillers).
 */
export interface GenEdSlotLike {
  id: string;
  label: string;
  cu: number;
  semPref: SemesterKey;
  intent?: SlotIntent;
  fulfillsDesc?: string;
  suggests?: readonly string[];
  note?: string | null;
}

// ---- Courses as placed in the plan ----

/**
 * A course entry as the scheduler places it into a semester. Superset of the
 * shared PlannedCourse (see gap notes at top of file).
 */
export interface SchedulerCourse extends Omit<PlannedCourse, 'tags'> {
  tags?: string[];
  // Catalog fields carried along by `...courseEntry(code)` spreads.
  off?: Offering;
  prereqs?: readonly string[];
  coreqs?: readonly string[];
  fa?: FaId | null;
  sec?: SectorId | null;
  energy?: boolean;
  isThermo?: boolean;
  isWritSem?: boolean;
  // Scheduler-attached state.
  isGenEd?: boolean;
  warning?: string;
  slotLabel?: string;
  /** Unique key for the placement map ('— <slotId>' placeholders). */
  placeholderCode?: string;
  fulfillsDesc?: string;
  suggests?: readonly string[];
  pool?: readonly string[];
}

/**
 * Minimal course shape the placement helpers need (canPlaceInSemester /
 * findBestSemester / earliestAllowedIdx operate on catalog entries,
 * fallback objects, and placed courses alike).
 */
export interface PlaceableCourse {
  cu: number;
  off?: Offering;
  prereqs?: readonly string[];
}

/**
 * Course data resolved for a gen-ed override / elective slot: either a full
 * catalog entry or the minimal fallback `{ code, title, cu, off: BOTH,
 * prereqs: [] }` the old code builds for unknown codes.
 */
export interface ResolvedCourseData extends PlaceableCourse {
  code: string;
  title: string;
  cu: number;
  off: Offering;
  prereqs: readonly string[];
  coreqs?: readonly string[];
  fa?: FaId | null;
  sec?: SectorId | null;
  energy?: boolean;
  isThermo?: boolean;
  isWritSem?: boolean;
  note?: string | null;
}

// ---- Core-course collection (stage 4/5) ----

/** A merged core-course entry with its degree attribution. */
export interface CoreCode {
  code: string;
  sas: boolean;
  seas: boolean;
}

// ---- Plan meta ----

/**
 * The scheduler's plan.meta. All fields are optional, matching the old
 * emptyPlan(meta = {}) contract — stages assume earlier stages populated
 * what they need (and crash identically if the pipeline is misordered).
 */
export interface SchedulerPlanMeta {
  sasMajor?: Major;
  seasMajor?: Major;
  sasConc?: ResolvedConcentration;
  seasConc?: ResolvedConcentration;
  sasMajorKey?: string;
  seasMajorKey?: string;
  sasConcKey?: string | null;
  seasConcKey?: string | null;
  /** { slotId: courseCode } elective overrides. */
  overrides?: Record<string, string>;
  /** Drag-drop placements: { code|slotId: semKey }. */
  customPlacements?: Record<string, string>;
  /** Course codes / slotIds explicitly removed by user. */
  deletedCourses?: Set<string>;
  curriculumMode?: CurriculumMode;
  viperMods?: ViperMods | null;
  /** Legacy summary flag. */
  viperModsEnabled?: boolean | null;
  shiftForward?: boolean;
  genedDistribution?: GenedDistribution;
  distributionTargets?: DistributionTargets;
  // ---- Stage-computed fields ----
  /** Stage 1: non-course credit flags (LANG_FL, STAT_WAIVER, EAS_0091). */
  creditFlags?: Set<string>;
  /** Stage 3: thermo course required by the MATH+CIS combo. */
  requiredThermo?: string;
  /** Stage 4: merged core course list. */
  coreCodes?: CoreCode[];
  /** Stage 4: codes shared by both majors (cross-degree double counts). */
  doubleCounted?: Set<string>;
  /** Stage 5: unified sample-schedule map (earliest preferred semester wins). */
  preferredSem?: Record<string, SemesterKey>;
  /** Stage 5: codes whose placement is user-explicit (drag-drop). */
  userPlacedCodes?: Set<string>;
  /** Stage 6: fulfilled FA / Sector requirement ids. */
  fulfilledFA?: Set<FaId>;
  fulfilledSec?: Set<SectorId>;
  /** Stage 10: number of energy courses in the plan. */
  energyCount?: number;
}

// ---- Summary ----

/** A course force-placed above Penn's 7.5 CU policy max. */
export interface ExceedsMaxCourse {
  sem: SemesterKey;
  code: string;
  title: string;
  cu: number;
}

/** NCC Foundation definition as the NCC module exposes it (NCC_FOUNDATIONS). */
export interface NccFoundationDef {
  id: string;
  satisfiedByViper?: { code: string } | null;
}

/** Per-Foundation status row in the NCC summary block. */
export interface NccFoundationStatus extends NccFoundationDef {
  satisfied: boolean;
  viperSatisfied: boolean;
  waivedByMod: boolean;
  sem: SemesterKey | 'credit' | null;
}

/** NCC-specific summary block (populated only in NCC mode). */
export interface NccSummary {
  dist: unknown;
  checks: unknown;
  foundations: NccFoundationStatus[];
  genEdCount: number;
  genEdBaseline: number;
  mods: ViperMods | null | undefined;
}

/** The scheduler's plan.summary (see gap notes at top of file). */
export interface SchedulerSummary extends Omit<PlanSummary, 'exceedsMaxCourses'> {
  sasMinRequired: number;
  seasMinRequired: number;
  meetsSASMin: boolean;
  meetsSEASMin: boolean;
  semesterLoads: Record<SemesterKey, number>;
  /** Load > 6.5 CU — kept for backwards-compat. */
  heavySemesters: SemesterKey[];
  /** All courses that had to be force-placed above Penn's policy max. */
  exceedsMaxCourses: ExceedsMaxCourse[];
  /** NCC-specific (populated only in NCC mode). */
  ncc: NccSummary | null;
}

// ---- The plan ----

/**
 * The plan as the scheduler builds it.
 *
 * Plan shape (old SECTION 2 header):
 * {
 *   semesters: { [semKey]: Course[] },   // placed courses per semester
 *   loads:     { [semKey]: number },     // summed CU per semester
 *   placement: { [code]: semKey|'credit' }, // tracks where each course sits
 *   summary:   { ... },                  // progress metrics (computed at end)
 *   meta:      { sasMajor, seasMajor, overrides, creditFlags }
 * }
 */
export interface SchedulerPlan extends Omit<Plan, 'semesters' | 'meta' | 'notes' | 'summary'> {
  semesters: Record<SemesterKey, SchedulerCourse[]>;
  meta: SchedulerPlanMeta;
  notes: PlanNote[];
  summary?: SchedulerSummary;
}

// ---- Stage signatures ----

/** A pipeline stage: transforms a Plan and returns it (stages mutate in place). */
export type PlanStage = (plan: SchedulerPlan) => SchedulerPlan;

/** A pipeline stage that also takes a context argument. */
export type PlanStageWithContext<C> = (plan: SchedulerPlan, ctx: C) => SchedulerPlan;

// ---- NCC module hook ----

/**
 * The surface of the NCC module the scheduler touches. The old code reached
 * it via `window.NCC?.…` (optional — legacy mode works without it). The port
 * uses an explicit registration point instead (see helpers.registerNccModule);
 * until src/ncc is wired up, all NCC hooks behave as if window.NCC was absent.
 */
export interface NccModule {
  normalizeViperMods: (
    mods: ViperMods | boolean | null | undefined,
  ) => ViperMods;
  NCC_GENED_SLOTS?: readonly GenEdSlotLike[];
  NCC_FOUNDATIONS: readonly NccFoundationDef[];
  computeNCCDistribution: (
    plan: SchedulerPlan,
    targets: DistributionTargets | undefined,
    mods: ViperMods | null | undefined,
  ) => unknown;
  runNCCChecks: (
    plan: SchedulerPlan,
    targets: DistributionTargets | undefined,
    mods: ViperMods | null | undefined,
  ) => unknown;
  countGenEds: (plan: SchedulerPlan) => number;
  baselineGenEdCount: (targets: DistributionTargets | undefined) => number;
}
