// Types for the static data layer, derived from actual usage in the old app's
// SECTION 1: DATA LAYER (references/old-app/index.html, lines ~298-1523).

import type { SemesterKey } from './semesters';

// ---- Semester-offering constants ----
export const FALL = 'F';
export const SPRING = 'S';
export const BOTH = 'B';

/** When a course is offered: Fall, Spring, or Both. */
export type Offering = typeof FALL | typeof SPRING | typeof BOTH;

/** College Foundational Approach ids (see FA_REQUIREMENTS). */
export type FaId = 'WRIT' | 'FL' | 'FRA' | 'QDA' | 'CCA' | 'CDUS';

/** College Sector ids (see SECTORS). */
export type SectorId = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'VII';

export type School = 'SAS' | 'SEAS';

/**
 * A catalog entry in the central course registry (COURSES).
 * Attributes (sector, FA, energy, offering) are looked up from this single
 * source, not duplicated in per-major definitions.
 */
export interface Course {
  title: string;
  cu: number;
  off: Offering;
  prereqs?: readonly string[];
  coreqs?: readonly string[];
  fa?: FaId;
  sec?: SectorId;
  energy?: boolean;
  isThermo?: boolean;
  isWritSem?: boolean;
  note?: string;
}

/**
 * A placement-ready course entry with default values filled in
 * (the return shape of courseEntry()).
 */
export interface CourseEntry {
  code: string;
  title: string;
  cu: number;
  off: Offering;
  prereqs: readonly string[];
  coreqs: readonly string[];
  fa: FaId | null;
  sec: SectorId | null;
  energy: boolean;
  isThermo: boolean;
  isWritSem: boolean;
  note: string | null;
}

/** A slot definition — each becomes an editable line in the plan. */
export interface ElectiveSlot {
  id: string;
  label: string;
  cu: number;
  /** Pre-screened course codes suggested for this slot. */
  pool?: readonly string[];
  /** Slot counts toward the VIPER energy requirement. */
  energy?: boolean;
  note?: string;
}

/**
 * Each concentration adds:
 *   • label, default (bool)
 *   • extraCore — additional required course codes
 *   • electiveSlots — slot definitions (each becomes an editable line)
 */
export interface Concentration {
  label: string;
  default?: boolean;
  note?: string;
  extraCore: readonly string[];
  /** Mutable: CIS non-AI concentrations are cloned from AI post-definition. */
  electiveSlots: ElectiveSlot[];
  sampleSchedule?: Readonly<Record<string, SemesterKey>>;
}

/** A documented course substitution (e.g. CHEM-CBE combo swaps). */
export interface Substitution {
  from: string;
  to: string;
  context: string;
  note: string;
}

/**
 * Major definitions. Each major has:
 *   • school — 'SAS' or 'SEAS'
 *   • code, fullName, minCU
 *   • autoSector — sector automatically completed by declaring this major (null if none)
 *   • concentrations — dict of concentration objects
 *   • sharedCore — course codes always required
 *   • notes — advisory text
 */
export interface Major {
  school: School;
  code: string;
  fullName: string;
  minCU: number;
  autoSector?: SectorId;
  note?: string;
  sharedCore: readonly string[];
  sampleSchedule: Readonly<Record<string, SemesterKey>>;
  concentrations: Record<string, Concentration>;
  substitutions?: readonly Substitution[];
  notes: readonly string[];
}

/** A fixed VIPER program course placement (VIPR 1200/1210/1300). */
export interface ViperFixedCourse {
  code: string;
  title: string;
  cu: number;
  semKey: SemesterKey;
  /** Locked in the plan — students cannot delete it. */
  fixed: boolean;
  note?: string;
}

export interface ViperProgram {
  fixedCourses: readonly ViperFixedCourse[];
  minTotalCU: number;
  minEnergyCourses: number;
  minSummerResearch: number;
  thermoOptions: readonly string[];
}

/**
 * An AP / placement credit option. Most entries grant a fixed list of
 * courses. Some (like AP Calc BC) have policy that varies by graduating
 * class — for those, `grants` (and `note`) is a function of gradYear.
 */
/** How incoming credit was earned — drives grouping in setup. */
export type ApCreditKind = 'ap' | 'ib' | 'alevel' | 'exam' | 'waiver';

export interface ApCredit {
  id: string;
  label: string;
  kind: ApCreditKind;
  /** false = placement/waiver only: removes a requirement but adds no CU. */
  credit: boolean;
  grants: readonly string[] | ((gradYear?: number | null) => readonly string[]);
  note: string | ((gradYear?: number | null) => string);
}

/** An ApCredit with `grants`/`note` resolved for a specific graduating year. */
export interface ResolvedApCredit {
  id: string;
  label: string;
  kind: ApCreditKind;
  credit: boolean;
  grants: readonly string[];
  note: string;
}

/** What a gen-ed slot fulfills (credited toward FA/Sector requirements). */
export interface GenEdIntent {
  fa?: FaId;
  sec?: SectorId;
}

/** A generic gen-ed slot — users pick courses themselves via the swap picker. */
export interface GenEdSlot {
  id: string;
  label: string;
  cu: number;
  semPref: SemesterKey;
  intent: GenEdIntent;
  fulfillsDesc: string;
  suggests: readonly string[];
  note: string;
}

/** A College Foundational Approach requirement. */
export interface FaRequirement {
  id: FaId;
  label: string;
  cu: number;
  note?: string;
}

/** A College Sector. */
export interface Sector {
  id: SectorId;
  label: string;
}

/** A common double-count course (displayed for reference). */
export interface DoubleCountRef {
  code: string;
  fulfills: readonly string[];
}
