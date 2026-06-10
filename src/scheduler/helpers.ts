// Shared scheduler helpers — ported verbatim from
// references/old-app/index.html, SECTION 2: SCHEDULER MODULE (lines ~1550-1636
// and ~2750). Semantics intentionally unchanged.

import { SEMESTER_KEYS, ALL_SEMESTER_KEYS, isFallSem } from '../data/semesters';
import type { SemesterKey } from '../data/semesters';
import { FALL, SPRING } from '../data/types';
import type { Major } from '../data/types';
import type { PlacementMap } from '../plan/types';
import type {
  NccModule,
  PlaceableCourse,
  ResolvedConcentration,
  SchedulerCourse,
  SchedulerPlan,
  SchedulerPlanMeta,
} from './types';

// ---- Load targets ----
export const TARGET_MIN = 4.5;
export const TARGET_IDEAL = 5.5;
export const TARGET_MAX = 6.5;
export const TARGET_HARD_CAP = 7.5;

// The 8 in-term semester keys, widened to SemesterKey so indexOf/includes
// accept any semester key (the old untyped code indexed freely).
export const REGULAR_SEMESTER_KEYS: readonly SemesterKey[] = SEMESTER_KEYS;

/** Type guard: is this string one of the 8 in-term semester keys? */
export function isRegularSemKey(key: string): key is SemesterKey {
  return (SEMESTER_KEYS as readonly string[]).includes(key);
}

// ---- NCC module hook ----
// The old scheduler reached the NCC module via `window.NCC?.…` — optional,
// because legacy/OCC mode works without it. With ES modules there is no
// window global, so the NCC module registers itself here. Until src/ncc is
// wired up, getNccModule() returns null and every NCC hook behaves exactly
// as the old code did when window.NCC was absent.
let nccModule: NccModule | null = null;

export function registerNccModule(mod: NccModule | null): void {
  nccModule = mod;
}

export function getNccModule(): NccModule | null {
  return nccModule;
}

// ========= Pure helper functions =========

export function roundCU(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Create an empty plan structure.
 */
export function emptyPlan(meta: SchedulerPlanMeta = {}): SchedulerPlan {
  const semesters = {} as Record<SemesterKey, SchedulerCourse[]>;
  const loads = {} as Record<SemesterKey, number>;
  // Initialize all 11 semester slots (8 in-term + 3 summer). The scheduler
  // doesn't actively place anything into summer beyond what fixedCourses
  // dictates, but the slots must exist so addCourse() doesn't crash when
  // VIPR 1300 is placed in summer-y1/y2/y3.
  for (const k of ALL_SEMESTER_KEYS) {
    semesters[k] = [];
    loads[k] = 0;
  }
  return { semesters, loads, placement: {}, meta, notes: [] };
}

/**
 * Check if a course can be placed in a given semester.
 */
export function canPlaceInSemester(
  course: Pick<PlaceableCourse, 'off'>,
  semKey: SemesterKey,
): boolean {
  if (course.off === FALL && !isFallSem(semKey)) return false;
  if (course.off === SPRING && isFallSem(semKey)) return false;
  return true;
}

/**
 * Determine the earliest semester index at which all prereqs are met.
 * Returns -1 if the course has no prereqs, a valid index (0-7), or null
 * if some prereq isn't scheduled yet.
 */
export function earliestAllowedIdx(
  course: Pick<PlaceableCourse, 'prereqs'>,
  placement: PlacementMap,
): number | null {
  if (!course.prereqs || course.prereqs.length === 0) return 0;
  let latest = -1;
  for (const p of course.prereqs) {
    const where = placement[p];
    if (where === 'credit') continue;
    if (where === undefined) return null;
    const idx = REGULAR_SEMESTER_KEYS.indexOf(where);
    if (idx > latest) latest = idx;
  }
  return latest + 1;
}

/**
 * Add a course to a semester, updating all affected plan state.
 */
export function addCourse(
  plan: SchedulerPlan,
  semKey: SemesterKey,
  entry: SchedulerCourse,
): SchedulerPlan {
  plan.semesters[semKey].push(entry);
  plan.loads[semKey] = roundCU(plan.loads[semKey] + entry.cu);
  plan.placement[entry.code] = semKey;
  return plan;
}

/**
 * Find the best semester for a course: earliest available that fits.
 */
export function findBestSemester(
  course: PlaceableCourse,
  plan: SchedulerPlan,
  earliestIdx = 0,
  maxLoad = TARGET_MAX,
): SemesterKey | null {
  for (let i = earliestIdx; i < REGULAR_SEMESTER_KEYS.length; i++) {
    const key = REGULAR_SEMESTER_KEYS[i]!;
    if (!canPlaceInSemester(course, key)) continue;
    if ((plan.loads[key] || 0) + course.cu <= maxLoad) return key;
  }
  return null;
}

/**
 * Find semester with lowest load that still fits the course.
 */
export function findLightestFitting(
  course: PlaceableCourse,
  plan: SchedulerPlan,
  earliestIdx = 0,
  maxLoad = TARGET_HARD_CAP,
): SemesterKey | null {
  let best: SemesterKey | null = null;
  let bestLoad = Infinity;
  for (let i = earliestIdx; i < REGULAR_SEMESTER_KEYS.length; i++) {
    const key = REGULAR_SEMESTER_KEYS[i]!;
    if (!canPlaceInSemester(course, key)) continue;
    const load = plan.loads[key] || 0;
    if (load + course.cu <= maxLoad && load < bestLoad) {
      best = key;
      bestLoad = load;
    }
  }
  return best;
}

/**
 * Helper: is semester A at-or-before semester B in the ordering?
 */
export function semBeforeOrEqual(a: SemesterKey, b: SemesterKey): boolean {
  return REGULAR_SEMESTER_KEYS.indexOf(a) <= REGULAR_SEMESTER_KEYS.indexOf(b);
}

/**
 * Resolve a concentration object given a major. Picks default if none specified.
 */
export function resolveConcentration(
  major: Major,
  key?: string | null,
): ResolvedConcentration {
  const concs = major.concentrations || {};
  const keys = Object.keys(concs);
  if (keys.length === 0) {
    return { _key: null, label: 'Standard', extraCore: [], electiveSlots: [] };
  }
  if (key && concs[key]) return { ...concs[key], _key: key };
  // Find default
  const defaultKey = keys.find((k) => concs[k]!.default) || keys[0]!;
  return { ...concs[defaultKey]!, _key: defaultKey };
}
