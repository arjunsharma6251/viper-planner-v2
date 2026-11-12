// SEAS curriculum facts read from the Penn catalog (catalog.upenn.edu,
// undergraduate/programs/<major>-bse, retrieved 2026-09-11, re-read
// 2026-11-12). The catalog pages are "intended as a guide for students
// entering in the Fall of 2026 and later"; since 2026-11-12 majors.ts uses
// them for every class (Michelle: use the catalog's plan of study).

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
 * the department accepts in its place. Surfaced in the course detail modal
 * so a student can swap without inventing a code, ticked by the major audit,
 * and used by the seed: when the other degree's core already holds an
 * alternative, the BSE course is not seeded twice (collect-core-courses).
 *
 * Re-read 2026-11-12 from each program's Requirements list, when majors.ts
 * moved to the catalog's plan of study. One addition the rows do not spell
 * out for every major: the lab version of a lab-less course (PHYS 0150 for
 * PHYS 0140, PHYS 0151 for PHYS 0141, CHEM 2411 for CHEM 2410) — the same
 * lecture with its lab, which CBE's and ESE's rows list explicitly.
 */
export const CORE_ALTERNATIVES: Readonly<Record<string, Readonly<Record<string, readonly string[]>>>> = {
  CBE: {
    'ESE 2030': ['ENM 2030'], // linear algebra
    'MATH 2300': ['ENM 2510'], // differential equations
    'PHYS 0140': ['PHYS 0150', 'PHYS 0170', 'MEAM 1100'],
    'PHYS 0141': ['PHYS 0151', 'PHYS 0171', 'ESE 1120'],
    'CHEM 1012': ['CHEM 1151'],
    'CHEM 1022': ['CHEM 1161'],
    'CHEM 2410': ['CHEM 2411'],
    'EAS 2030': ['CBE 3200', 'VIPR 1200', 'VIPR 1210'],
  },
  MSE: {
    'ESE 2030': ['ENM 2030', 'ENM 2400'],
    'PHYS 0140': ['MEAM 1100', 'PHYS 0150'],
    'PHYS 0141': ['PHYS 0151'],
    'EAS 2030': ['VIPR 1200', 'VIPR 1210'],
  },
  MEAM: {
    'ESE 2030': ['ENM 2030'],
    'PHYS 0150': ['MEAM 1100'], // the catalog's first option: MEAM 1100 with the MEAM 1470 lab
    'PHYS 0151': ['ESE 1120'],
    'CHEM 1012': ['BIOL 1121'],
    'ENGR 1050': ['CIS 1100', 'CIS 1200'],
    'EAS 2030': ['VIPR 1200', 'VIPR 1210'],
  },
  ESE: {
    'ESE 2030': ['ENM 2030'],
    'PHYS 0150': ['MEAM 1100', 'PHYS 0140', 'PHYS 0170'],
    'CHEM 1012': ['EAS 0091', 'BIOL 1101', 'BIOL 1121'],
    'CIS 1100': ['CIS 1210', 'CIS 2400'], // "2 CU from CIS 1100, 1200, 1210, 2400"
    'CIS 1200': ['CIS 1210', 'CIS 2400'],
    'ESE 2910': ['ESE 3190', 'ESE 3360', 'ESE 3500', 'ESE 4210', 'BE 4700'], // design course in place of ESE 2900 & 2910
    'EAS 2030': ['LAWM 5060', 'VIPR 1200', 'VIPR 1210'],
  },
  CIS: {
    'MATH 1410': ['MATH 1610'],
    'ESE 2030': ['ENM 2030', 'ENM 2400'],
    'CIS 2610': ['ESE 3010', 'STAT 4300'],
    'PHYS 0150': ['MEAM 1100', 'PHYS 0170'],
    'PHYS 0151': ['PHYS 0171', 'ESE 1120'],
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
