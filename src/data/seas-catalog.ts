// SEAS curriculum facts read from the Penn catalog (catalog.upenn.edu,
// undergraduate/programs/<major>-bse, retrieved 2026-09-11). The catalog
// pages are "intended as a guide for students entering in the Fall of 2026
// and later"; earlier cohorts (VIPER '28 entered Fall 2024) follow the
// requirement sheet of their entry year, so treat alternatives as "accepted
// by the department" rather than as a rewrite of the core lists in majors.ts.

/**
 * The 7 CU of SEAS general electives, per major. Every major requires one
 * ethics course and a Writing seminar inside the SS/H group; the remaining
 * five split differently. Buckets are CU counts AFTER removing the Writing
 * seminar (it is tracked separately), so they sum to 5.
 *   ss      — must be Social Science (EUSS)
 *   h       — must be Humanities (EUHS)
 *   ssh     — Social Science or Humanities
 *   sshTbs  — Social Science, Humanities, or Technology in Business & Society (EUTB)
 */
export interface SeasGenEdSpec {
  ss: number
  h: number
  ssh: number
  sshTbs: number
  /** Courses the catalog accepts for the ethics slot. VIPR 1200/1210 covers it for VIPER. */
  ethics: readonly string[]
}

export const SEAS_GEN_ED: Readonly<Record<string, SeasGenEdSpec>> = {
  // "Select 4 SS or H courses" (incl. Writing) + "Select 2 SS, H or TBS courses"
  CBE: { ss: 0, h: 0, ssh: 3, sshTbs: 2, ethics: ['EAS 2030', 'CBE 3200'] },
  MSE: { ss: 0, h: 0, ssh: 3, sshTbs: 2, ethics: ['EAS 2030'] },
  ESE: { ss: 0, h: 0, ssh: 3, sshTbs: 2, ethics: ['EAS 2030', 'LAWM 5060'] },
  CIS: { ss: 0, h: 0, ssh: 3, sshTbs: 2, ethics: ['EAS 2030', 'CIS 4230', 'CIS 5230', 'LAWM 5060'] },
  // "Select 1 SS" + "Select 2 H" (Writing is one of them) + "Select 1 SS or H" + "Select 2 SS/H/TBS"
  MEAM: { ss: 1, h: 1, ssh: 1, sshTbs: 2, ethics: ['EAS 2030'] },
}

/**
 * Core courses with catalog-listed alternatives ("X or Y" rows), per SEAS
 * major. Keyed by the code used in majors.ts sharedCore, listing the codes
 * the department accepts in its place. Surfaced in the course detail
 * modal so a student can swap without inventing a code.
 */
export const CORE_ALTERNATIVES: Readonly<Record<string, Readonly<Record<string, readonly string[]>>>> = {
  CBE: {
    'MATH 2400': ['ESE 2030', 'ENM 2030', 'ENM 2400'], // linear algebra requirement
    'MATH 2410': ['MATH 2300', 'ENM 2510'], // ODE / PDE requirement
    'PHYS 0150': ['PHYS 0140', 'PHYS 0170', 'MEAM 1100'],
    'PHYS 0151': ['PHYS 0141', 'PHYS 0171', 'ESE 1120'],
    'CHEM 1012': ['CHEM 1151'],
    'CHEM 1022': ['CHEM 1161'],
    'CHEM 2411': ['CHEM 2410'],
    'EAS 2030': ['CBE 3200', 'VIPR 1200', 'VIPR 1210'],
  },
  MSE: {
    'MATH 2400': ['ESE 2030', 'ENM 2030', 'ENM 2400'],
    'PHYS 0150': ['PHYS 0140', 'MEAM 1100'],
    'EAS 2030': ['VIPR 1200', 'VIPR 1210'],
  },
  MEAM: {
    'MATH 2400': ['ESE 2030', 'ENM 2030'],
    'PHYS 0150': ['MEAM 1100'], // with MEAM 1470 lab
    'PHYS 0151': ['ESE 1120'],
    'CHEM 1012': ['BIOL 1121'],
    'ENGR 1050': ['CIS 1100', 'CIS 1200'],
    'EAS 2030': ['VIPR 1200', 'VIPR 1210'],
  },
  ESE: {
    'PHYS 0150': ['MEAM 1100', 'PHYS 0140', 'PHYS 0170'],
    'CHEM 1012': ['EAS 0091', 'BIOL 1101', 'BIOL 1121'],
    'EAS 2030': ['LAWM 5060', 'VIPR 1200', 'VIPR 1210'],
  },
  CIS: {
    'MATH 1410': ['MATH 1610'],
    'MATH 2400': ['ESE 2030', 'ENM 2030', 'ENM 2400'],
    'CIS 2610': ['ESE 3010', 'STAT 4300'],
    'PHYS 0150': ['MEAM 1100', 'PHYS 0170'],
    'PHYS 0151': ['PHYS 0171'],
    'CIS 4000': ['CIS 4100'],
    'CIS 4010': ['CIS 4110'],
    'EAS 2030': ['CIS 4230', 'CIS 5230', 'LAWM 5060', 'VIPR 1200', 'VIPR 1210'],
  },
}

/** Alternatives the department accepts for a course, for a given SEAS major. */
export function alternativesFor(seasMajorKey: string | null | undefined, code: string): readonly string[] {
  if (!seasMajorKey) return []
  return CORE_ALTERNATIVES[seasMajorKey]?.[code] ?? []
}
