import type { ApCredit, ResolvedApCredit } from './types';

// ---- Incoming credit: AP / IB / A-level exams, Penn credit & placement exams, waivers ----
//
// Source of truth for exam policy: Penn Admissions "Pre-College Credits"
// (https://admissions.upenn.edu/how-to-apply/first-year-applicants/pre-college-credits),
// checked 2026-09. Only entries that touch VIPER majors' requirements are listed —
// a student with AP Art History does not need it modeled here.
//
// `credit: false` entries are placement/waivers: they remove a requirement from the
// plan but add no CU toward the degree. They still matter for planning (a waived
// lab is a free semester slot), which is why they stay in the list, grouped apart.
//
// AP Calculus BC policy history:
//   • Class of 2025/2024: BC = MATH 1400 + retroactive credit option for MATH 1410
//   • Class of 2026/2027: BC = MATH 1400
//   • Class of 2028+    : BC = MATH 1300 only (NOT MATH 1400). Penn restricted this
//     in 2024 because retroactive credit was creating bad incentives — students
//     gambling on MATH 1410 to backfill MATH 1400 and failing.
//     Per Penn Math Dept (2024): "students in the Class of 2028 and beyond are
//     only eligible to receive credit for MATH 1300 and a waiver for the MATH
//     1400 prerequisite in upper-level courses."
export const AP_CREDITS: readonly ApCredit[] = [
  // ---- AP ----
  { id: 'ap-calc-bc',     kind: 'ap', credit: true, label: 'AP Calculus BC (5)',
    grants: (gradYear) => {
      // Class of 2028+: MATH 1300 only. Earlier classes: MATH 1400.
      if (!gradYear || gradYear >= 2028) return ['MATH 1300'];
      return ['MATH 1400'];
    },
    note: (gradYear) => {
      if (!gradYear || gradYear >= 2028) {
        return 'Class of 2028+: grants MATH 1300 (1 CU) and a MATH 1400 prerequisite waiver. (Penn restricted BC credit in 2024.)';
      }
      return 'Class of 2027 or earlier: grants MATH 1400 (1 CU).';
    } },
  { id: 'ap-calc-ab',     kind: 'ap', credit: false, label: 'AP Calculus AB (5)',
    grants: [],
    note: 'Penn awards no credit for Calculus AB — placement only. Take the Penn Math credit exam if you want MATH 1400 credit.' },
  { id: 'ap-phys-c-mech', kind: 'ap', credit: true, label: 'AP Physics C: Mechanics (5)', grants: ['PHYS 0150'],
    note: 'Grants PHYS 0150 (1.5 CU).' },
  { id: 'ap-phys-c-em',   kind: 'ap', credit: true, label: 'AP Physics C: E&M (5)', grants: ['PHYS 0151'],
    note: 'Grants PHYS 0151 (1.5 CU).' },
  { id: 'ap-chem',        kind: 'ap', credit: true, label: 'AP Chemistry (5)', grants: ['EAS_0091'],
    note: 'Grants EAS 0091 (1 CU, Engineering only). NOT accepted toward CHEM or CBE major requirements — use the Penn CHEM placement exam for those.' },
  { id: 'ap-cs-a',        kind: 'ap', credit: true, label: 'AP Computer Science A (5)', grants: ['CIS 1100'],
    note: 'Grants CIS 1100 (1 CU).' },
  { id: 'ap-stat',        kind: 'ap', credit: false, label: 'AP Statistics (5)', grants: ['STAT_WAIVER'],
    note: 'Waives STAT 1010 / STAT 1110. No CU.' },

  // ---- IB (Higher Level) & A-level ----
  { id: 'ib-chem-hl',     kind: 'ib', credit: true, label: 'IB Chemistry HL (6–7)', grants: ['EAS_0091'],
    note: 'Grants EAS 0091 (1 CU, Engineering only). Not accepted toward CHEM or CBE.' },
  { id: 'ib-phys-hl',     kind: 'ib', credit: true, label: 'IB Physics HL (6–7)', grants: ['PHYS 0150'],
    note: 'Grants PHYS 0150 (1.5 CU) and PHYS 0102 (1.5 CU). Only PHYS 0150 counts toward the majors modeled here.' },
  { id: 'alevel-phys',    kind: 'alevel', credit: true, label: 'A-level Physics (A*/A)', grants: ['PHYS 0150', 'PHYS 0151'],
    note: 'Grants PHYS 0150 and PHYS 0151 (1.5 CU each).' },
  { id: 'alevel-chem',    kind: 'alevel', credit: true, label: 'A-level Chemistry (A*/A)', grants: ['EAS_0091'],
    note: 'Grants EAS 0091 (1 CU, Engineering only). Not accepted toward CHEM or CBE.' },

  // ---- Penn credit & placement exams (taken once enrolled) ----
  { id: 'chem-placement', kind: 'exam', credit: true, label: 'Penn Chemistry placement exam', grants: ['CHEM 1012', 'CHEM 1022'],
    note: 'Departmental exam for credit — the route CHEM and CBE majors with strong prior chemistry should take.' },
  { id: 'math-credit-1400', kind: 'exam', credit: true, label: 'Penn Math credit exam — MATH 1400', grants: ['MATH 1400'],
    note: 'Offered by the Math Department at the start of each semester. Grants MATH 1400 (1 CU).' },
  { id: 'math-credit-1410', kind: 'exam', credit: true, label: 'Penn Math credit exam — MATH 1410', grants: ['MATH 1410'],
    note: 'Offered by the Math Department at the start of each semester. Grants MATH 1410 (1 CU).' },

  // ---- Waivers (requirement removed, no CU) ----
  { id: 'chem-lab-waiver', kind: 'waiver', credit: false, label: 'CHEM 1101 / 1102 lab waiver', grants: ['CHEM 1101', 'CHEM 1102'],
    note: 'Case-by-case with the Chemistry Department. Removes the intro labs from the plan; adds no CU.' },
  { id: 'lang-fluency',   kind: 'waiver', credit: false, label: 'Language requirement met (AP 5 / IB HL / fluency exam)', grants: ['LANG_FL'],
    note: 'Satisfies the Foreign Language foundation. Any CU the exam itself grants is not modeled here.' },
];

/** Display groups for setup, in order. */
export const AP_CREDIT_GROUPS: ReadonlyArray<{
  kinds: readonly ApCredit['kind'][];
  label: string;
  hint?: string;
}> = [
  { kinds: ['ap', 'ib', 'alevel'], label: 'AP, IB & A-level exams' },
  { kinds: ['exam'], label: 'Penn credit & placement exams', hint: 'Taken once you are on campus.' },
  { kinds: ['waiver'], label: 'Waivers', hint: 'Remove a requirement but add no CU.' },
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
