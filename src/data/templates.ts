import type { SemesterKey } from './semesters'
import { MAJORS } from './majors'

/**
 * Hand-built four-year plans from the VIPER program office (Michelle
 * Hutchings, October 2026). When a student's combination matches one of
 * these, the seed uses the template instead of the scheduler: Michelle's
 * plans encode pairing-specific choices (P-Chem in Year 3 alongside CBE,
 * ESE 2030 + ENM 2510 for the math sequence, CBE 3530 standing in for
 * CHEM 2220) that a per-major scheduler cannot.
 *
 * The templates are NCC-native and were drawn up assuming the VIPER
 * proposal (language waived, 12+2+1 distribution). Under confirmed policy
 * the seed tops them up with the extra Foundation and distribution slots
 * the College still requires (src/plan/template-seed.ts); the proposal
 * itself only ever shows in admin mode.
 *
 * Transcription notes (decisions made when copying the source documents):
 * - Organic chemistry uses the catalog's CHEM 2411 / CHEM 2421 (1.5 CU,
 *   lecture with lab). Michelle wrote CHEM 2410 + 2412 / 2420 + 2422; the
 *   department offers the lab only as part of the 1.5 CU 2411/2412 pair.
 * - VIPR 1200 / 1210 / 1300 follow VIPER_PROGRAM.fixedCourses (the program
 *   rule), not each document's rows: the CHEM+MSE PDF had a stray extra
 *   VIPR 1300 in Fall Y2 and the PHYS+MSE document showed none in summers.
 * - Named Foundation courses (COL 0100 / COL 0200) are seeded as open
 *   Kite / Key slots, as in the CHEM+CBE plan.
 * - PHYS+MSE is the Business & Technology concentration ("B&T Elective").
 */

/** A requirement slot left open for the student to fill. */
export type TemplateSlotKind =
  | 'writ'
  | 'kite'
  | 'key'
  | 'pad'
  | 'dist-ss'
  | 'dist-h'
  | 'elective'

export type TemplateCategory = 'sas' | 'seas' | 'both'

export type TemplateEntry =
  | {
      /** A named course from the catalog. */
      code: string
      category: TemplateCategory
      /** Elective slot this course fills (keeps the swap picker working). */
      slotId?: string
      slotLabel?: string
      pool?: readonly string[]
      note?: string
    }
  | {
      slot: TemplateSlotKind
      /** Required for 'elective' slots. */
      label?: string
      slotId?: string
      category?: TemplateCategory
    }

export interface PlanTemplate {
  id: string
  /** Where the plan came from, shown nowhere student-facing. */
  source: string
  sasMajorKey: string
  sasConcKey: string
  seasMajorKey: string
  seasConcKey: string
  /** In-term and summer terms. VIPR courses are added from VIPER_PROGRAM. */
  terms: Partial<Record<SemesterKey, readonly TemplateEntry[]>>
}

const c = (code: string, category: TemplateCategory, extra: Omit<Extract<TemplateEntry, { code: string }>, 'code' | 'category'> = {}): TemplateEntry => ({
  code,
  category,
  ...extra,
})
const s = (slot: TemplateSlotKind, extra: Omit<Extract<TemplateEntry, { slot: TemplateSlotKind }>, 'slot'> = {}): TemplateEntry => ({
  slot,
  ...extra,
})

export const PLAN_TEMPLATES: readonly PlanTemplate[] = [
  {
    id: 'chem-cbe',
    source: 'NCC_4yr-Plan_CHEM+CBE (VIPER office, Oct 2026)',
    sasMajorKey: 'CHEM',
    sasConcKey: 'STANDARD',
    seasMajorKey: 'CBE',
    seasConcKey: 'ENERGY',
    terms: {
      'fall-y1': [c('CBE 1600', 'seas'), c('MATH 1400', 'both'), c('CHEM 1012', 'both'), c('CHEM 1101', 'both'), c('PHYS 0150', 'both')],
      'spring-y1': [c('CHEM 1022', 'both'), c('CHEM 1102', 'both'), c('MATH 1410', 'both'), c('PHYS 0151', 'both'), s('writ')],
      'fall-y2': [
        c('CBE 2300', 'seas'),
        c('CHEM 2411', 'both'),
        c('ESE 2030', 'seas', { note: 'Linear algebra; accepted in place of MATH 2400.' }),
        c('ENGR 1050', 'seas'),
        s('kite'),
      ],
      'spring-y2': [
        c('CBE 3500', 'seas'),
        c('CBE 2310', 'seas'),
        c('CHEM 2421', 'sas'),
        c('ENM 2510', 'seas', { note: 'Accepted in place of MATH 2410.' }),
        s('key'),
      ],
      'fall-y3': [
        c('CBE 3510', 'seas'),
        c('CBE 3600', 'seas'),
        c('CHEM 2210', 'sas'),
        c('CHEM 2510', 'sas'),
        c('EAS 4010', 'seas', { slotId: 'cbe-conc-1', slotLabel: 'Concentration 1 / Energy' }),
        s('pad'),
      ],
      'spring-y3': [
        c('CBE 3530', 'both', { note: 'Also stands in for CHEM 2220 (approved CHEM-CBE substitution).' }),
        c('CBE 3710', 'seas'),
        c('CHEM 2230', 'sas'),
        s('dist-ss'),
        s('dist-ss'),
      ],
      'fall-y4': [c('CBE 4000', 'seas'), c('CBE 4100', 'seas'), c('CBE 4510', 'seas'), c('CHEM 2460', 'sas'), c('CHEM 2610', 'sas')],
      'spring-y4': [
        c('CBE 4590', 'seas'),
        c('CBE 5050', 'seas', { slotId: 'cbe-conc-3', slotLabel: 'Concentration 3 / Energy', pool: ['CBE 5050'] }),
        c('CBE 3250', 'seas', { slotId: 'cbe-conc-2', slotLabel: 'Concentration 2 / Energy', pool: ['CBE 3250'] }),
        s('dist-h'),
      ],
    },
  },
  {
    id: 'chem-mse',
    source: 'NCC_4yr-Plan_CHEM+MSE (VIPER office, Oct 2026)',
    sasMajorKey: 'CHEM',
    sasConcKey: 'STANDARD',
    seasMajorKey: 'MSE',
    seasConcKey: 'ENERGY',
    terms: {
      'fall-y1': [c('MSE 1010', 'seas'), c('CHEM 1012', 'both'), c('CHEM 1101', 'both'), c('MATH 1400', 'both'), c('PHYS 0150', 'both')],
      'spring-y1': [c('MATH 1410', 'both'), c('CHEM 1022', 'both'), c('CHEM 1102', 'sas'), c('PHYS 0151', 'both'), c('ENGR 1050', 'seas'), s('writ')],
      'fall-y2': [
        c('MSE 2010', 'seas'),
        c('MSE 2200', 'seas'),
        c('MSE 2210', 'seas'),
        c('CHEM 2411', 'sas'),
        c('ESE 2030', 'seas', { note: 'Linear algebra; accepted in place of MATH 2400.' }),
      ],
      'spring-y2': [
        c('MSE 2020', 'seas'),
        c('MSE 2150', 'seas'),
        c('MSE 2600', 'seas'),
        c('CHEM 2421', 'sas'),
        c('ENM 2510', 'seas', { note: 'In place of MATH 2410.' }),
        s('kite'),
      ],
      'fall-y3': [
        c('MSE 3010', 'seas'),
        c('MSE 3300', 'seas'),
        c('MSE 3600', 'seas'),
        c('CHEM 2210', 'sas'),
        c('MSE 5450', 'seas', { slotId: 'mse-energy-2', slotLabel: 'MSE Elective / Energy Course', pool: ['MSE 5450'] }),
        s('key'),
      ],
      'spring-y3': [c('MSE 3930', 'seas'), c('CHEM 2220', 'sas'), c('CHEM 2230', 'sas'), c('CHEM 2510', 'sas'), s('pad'), s('dist-h')],
      'fall-y4': [
        c('MSE 4600', 'seas'),
        c('MSE 4950', 'seas'),
        c('CHEM 2460', 'sas'),
        c('CHEM 2610', 'sas'),
        c('STAT 4300', 'seas', { slotId: 'mse-math', slotLabel: 'Math Elective', pool: ['STAT 4300', 'MATH 3130', 'MATH 4100'] }),
        s('dist-h'),
      ],
      'spring-y4': [
        c('MSE 4050', 'seas'),
        c('MSE 4400', 'seas'),
        c('MSE 4960', 'seas'),
        c('MSE 4550', 'seas', { slotId: 'mse-energy-1', slotLabel: 'MSE Elective / Energy Course', pool: ['MSE 4550'] }),
        s('dist-h'),
      ],
    },
  },
  {
    id: 'phys-bt-mse',
    source: 'NCC_4-yr-plan_PHYS+MSE (VIPER office, Oct 2026)',
    sasMajorKey: 'PHYS',
    sasConcKey: 'BIZ',
    seasMajorKey: 'MSE',
    seasConcKey: 'ENERGY',
    terms: {
      'fall-y1': [c('MATH 1400', 'both'), c('PHYS 0150', 'both'), c('CHEM 1012', 'seas'), c('CHEM 1101', 'seas'), c('MSE 1010', 'seas')],
      'spring-y1': [c('MATH 1410', 'both'), c('PHYS 0151', 'both'), c('CHEM 1022', 'seas'), c('ENGR 1050', 'seas'), s('kite')],
      'fall-y2': [c('MATH 2400', 'both'), c('MSE 2010', 'seas'), c('MSE 2200', 'seas'), c('MSE 2210', 'seas'), c('PHYS 1230', 'sas'), s('writ')],
      'spring-y2': [
        c('MATH 2410', 'both'),
        c('MSE 2020', 'seas'),
        c('MSE 2150', 'seas'),
        c('MSE 2600', 'seas'),
        c('PHYS 1250', 'sas'),
        s('elective', { label: 'B&T Elective', slotId: 'biz-1', category: 'sas' }),
      ],
      'fall-y3': [
        c('MSE 3010', 'seas'),
        c('MSE 3300', 'seas'),
        c('MSE 3600', 'seas'),
        c('PHYS 3361', 'sas'),
        s('elective', { label: 'B&T Elective', slotId: 'biz-2', category: 'sas' }),
        s('pad'),
      ],
      'spring-y3': [
        c('MSE 3930', 'seas'),
        c('PHYS 3362', 'sas'),
        c('PHYS 3351', 'sas'),
        c('MSE 4550', 'seas', { slotId: 'mse-energy-1', slotLabel: 'MSE Elective / Energy Course', pool: ['MSE 4550', 'MSE 5450'] }),
        s('elective', { label: 'B&T Elective', slotId: 'biz-3', category: 'sas' }),
        s('dist-ss'),
      ],
      'fall-y4': [
        c('MSE 4600', 'seas'),
        c('MSE 4950', 'seas'),
        c('PHYS 4401', 'sas'),
        c('PHYS 4411', 'both', { note: 'Or an MSE Math Elective by petition.' }),
        c('MSE 5450', 'seas', { slotId: 'mse-energy-2', slotLabel: 'MSE Elective / Energy Course', pool: ['MSE 5450', 'MSE 4550'] }),
        s('dist-h'),
      ],
      'spring-y4': [
        c('MSE 4050', 'seas'),
        c('MSE 4400', 'seas'),
        c('MSE 4960', 'seas'),
        c('PHYS 3364', 'sas', { slotId: 'phys-lab', slotLabel: 'Physics Lab Elective (APHL)', pool: ['PHYS 3364'] }),
        s('elective', { label: 'B&T Elective', slotId: 'biz-4', category: 'sas' }),
        s('dist-ss'),
      ],
    },
  },
]

/** A major's default concentration key (what setup picks when none is chosen). */
function defaultConcKey(majorKey: string): string | null {
  const entries = Object.entries(MAJORS[majorKey]?.concentrations ?? {})
  return entries.find(([, conc]) => conc.default)?.[0] ?? entries[0]?.[0] ?? null
}

/** The template for a combination, or null when the scheduler should seed. */
export function findTemplate(
  sasMajorKey: string,
  sasConcKey: string | null,
  seasMajorKey: string,
  seasConcKey: string | null,
): PlanTemplate | null {
  const sasConc = sasConcKey ?? defaultConcKey(sasMajorKey)
  const seasConc = seasConcKey ?? defaultConcKey(seasMajorKey)
  return (
    PLAN_TEMPLATES.find(
      (t) =>
        t.sasMajorKey === sasMajorKey &&
        t.seasMajorKey === seasMajorKey &&
        t.sasConcKey === sasConc &&
        t.seasConcKey === seasConc,
    ) ?? null
  )
}
