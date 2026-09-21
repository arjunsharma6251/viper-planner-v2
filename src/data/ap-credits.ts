import type { ApCredit, ResolvedApCredit } from './types';

// ---- Incoming credit: AP / IB / A-level exams, Penn credit exams, waivers ----
//
// Only entries that grant credit toward, or remove a requirement from, a
// VIPER major are listed. Reviewer-confirmed 2026-09-21: AP Calculus AB/BC,
// AP Chemistry, AP Statistics, IB Chemistry and A-level Chemistry grant no
// usable credit for VIPER students (BC → MATH 1300 only for '28+, AP Chem →
// EAS 0091 which CHEM/CBE refuse), so they are not offered here.
//
// Sources checked 2026-09: Penn Admissions "Pre-College Credits";
// math.upenn.edu credit exams (1300/1070/1080/1400/1410/2200 — no 2300 exam
// listed); chem.upenn.edu General Chemistry credit exams (1012 and 1022 are
// separate exams); bio.upenn.edu equivalency exams (1101, 1102, 1121).
//
// `credit: false` entries are waivers: they remove a requirement from the
// plan but add no CU toward the degree.
export const AP_CREDITS: readonly ApCredit[] = [
  // ---- AP ----
  { id: 'ap-phys-c-mech', kind: 'ap', credit: true, label: 'AP Physics C: Mechanics (5)', grants: ['PHYS 0150'],
    note: 'Grants PHYS 0150 (1.5 CU).' },
  { id: 'ap-phys-c-em',   kind: 'ap', credit: true, label: 'AP Physics C: E&M (5)', grants: ['PHYS 0151'],
    note: 'Grants PHYS 0151 (1.5 CU).' },
  { id: 'ap-cs-a',        kind: 'ap', credit: true, label: 'AP Computer Science A (5)', grants: ['CIS 1100'],
    note: 'Grants CIS 1100 (1 CU).' },

  // ---- IB (Higher Level) & A-level ----
  { id: 'ib-phys-hl',     kind: 'ib', credit: true, label: 'IB Physics HL (6–7)', grants: ['PHYS 0150'],
    note: 'Grants PHYS 0150 (1.5 CU) and PHYS 0102 (1.5 CU). Only PHYS 0150 counts toward the majors modeled here.' },
  { id: 'alevel-phys',    kind: 'alevel', credit: true, label: 'A-level Physics (A*/A)', grants: ['PHYS 0150', 'PHYS 0151'],
    note: 'Grants PHYS 0150 and PHYS 0151 (1.5 CU each).' },

  // ---- Penn credit exams (taken once enrolled; ungraded credit) ----
  { id: 'chem-1012', kind: 'exam', credit: true, label: 'CHEM 1012 · General Chemistry I', grants: ['CHEM 1012'],
    note: 'Chemistry Department credit exam, 2 hours, once. Ungraded credit (1 CU). The lab (CHEM 1101) is not waived.' },
  { id: 'chem-1022', kind: 'exam', credit: true, label: 'CHEM 1022 · General Chemistry II', grants: ['CHEM 1022'],
    note: 'Chemistry Department credit exam, 2 hours, once. Ungraded credit (1 CU). The lab (CHEM 1102) is not waived.' },
  { id: 'math-1400', kind: 'exam', credit: true, label: 'MATH 1400 · Calculus I', grants: ['MATH 1400'],
    note: 'Math Department credit exam at the start of each semester. Grants MATH 1400 (1 CU).' },
  { id: 'math-1410', kind: 'exam', credit: true, label: 'MATH 1410 · Calculus II', grants: ['MATH 1410'],
    note: 'Math Department credit exam at the start of each semester. Grants MATH 1410 (1 CU).' },
  { id: 'math-2200', kind: 'exam', credit: true, label: 'MATH 2200 · Linear Algebra', grants: ['MATH 2200'],
    note: 'Math Department credit exam. MATH 2200 replaced MATH 2400 in Summer 2026. Grants 1 CU.' },
  { id: 'math-2300', kind: 'exam', credit: true, label: 'MATH 2300 · Differential Equations', grants: ['MATH 2300'],
    note: 'MATH 2300 replaced MATH 2410 in Summer 2026. Penn Math currently lists no 2300 credit exam — confirm with the department.' },
  { id: 'biol-1101', kind: 'exam', credit: true, label: 'BIOL 1101 · Intro Biology A', grants: ['BIOL 1101'],
    note: 'Biology equivalency exam, incoming students only, each fall. Lecture credit (1 CU).' },
  { id: 'biol-1102', kind: 'exam', credit: true, label: 'BIOL 1102 · Intro Biology B', grants: ['BIOL 1102'],
    note: 'Biology equivalency exam, incoming students only, each fall. Lecture credit (1 CU).' },
  { id: 'biol-1121', kind: 'exam', credit: true, label: 'BIOL 1121 · Intro Biology — Molecular', grants: ['BIOL 1121'],
    note: 'Biology equivalency exam, incoming students only, each fall. Lecture credit (1 CU).' },

  // ---- Waivers (requirement removed, no CU) ----
  { id: 'chem-1101-waiver', kind: 'waiver', credit: false, label: 'CHEM 1101 lab waiver', grants: ['CHEM 1101'],
    note: 'Case-by-case with the Chemistry Department. Removes General Chemistry Lab I from the plan; adds no CU.' },
  { id: 'chem-1102-waiver', kind: 'waiver', credit: false, label: 'CHEM 1102 lab waiver', grants: ['CHEM 1102'],
    note: 'Case-by-case with the Chemistry Department. Removes General Chemistry Lab II from the plan; adds no CU.' },
  // Statistics and economics waivers are recorded for the plan and the chat
  // digest. No VIPER major core seeds STAT 1010/1110 or ECON 0100/0110, so
  // they remove nothing from the seed.
  { id: 'stat-waiver',    kind: 'waiver', credit: false, label: 'Statistics waiver (STAT 1010 / 1110)', grants: ['STAT_WAIVER'],
    note: 'Introductory statistics requirement waived. No CU.' },
  { id: 'econ-waiver',    kind: 'waiver', credit: false, label: 'Economics waiver (ECON 0100 / 0110)', grants: ['ECON_WAIVER'],
    note: 'Introductory economics requirement waived. No CU.' },
  { id: 'lang-fluency',   kind: 'waiver', credit: false, label: 'Language requirement met', grants: ['LANG_FL'],
    note: 'Satisfies the Language foundation (AP 5 / IB HL / fluency exam). Any CU the exam itself grants is not modeled here.' },
];

/** Display groups for setup, in order. */
export const AP_CREDIT_GROUPS: ReadonlyArray<{
  kinds: readonly ApCredit['kind'][];
  label: string;
  hint?: string;
}> = [
  { kinds: ['ap', 'ib', 'alevel'], label: 'AP, IB & A-level exams' },
  { kinds: ['exam'], label: 'Credit exams' },
  { kinds: ['waiver'], label: 'Waivers' },
];

// Helper: resolve an AP credit entry's `grants` and `note` for a given graduating year.
export function resolveAPCredit(entry: ApCredit, gradYear?: number | null): ResolvedApCredit {
  return {
    id: entry.id,
    label: entry.label,
    kind: entry.kind,
    credit: entry.credit,
    grants: typeof entry.grants === 'function' ? entry.grants(gradYear) : entry.grants,
    note:   typeof entry.note   === 'function' ? entry.note(gradYear)   : entry.note,
  };
}
