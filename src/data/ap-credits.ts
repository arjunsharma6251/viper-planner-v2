import type { ApCredit, ResolvedApCredit } from './types';

// ---- AP / Placement credit options ----
// Most entries grant a fixed list of courses. Some (like AP Calc BC) have policy
// that varies by graduating class — for those, `grants` is a function of gradYear
// returning the granted course list for that cohort.
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
  { id: 'ap-calc-ab',     label: 'AP Calculus AB (5)',        grants: ['MATH 1400'],     note: 'AB credit policy varies by year — verify with Penn Math. Currently modeled as: grants MATH 1400 (1 CU). If your cohort only gets a placement waiver without credit, deselect this.' },
  { id: 'ap-calc-bc',     label: 'AP Calculus BC (5)',
    grants: (gradYear) => {
      // Class of 2028+: MATH 1300 only. Earlier classes: MATH 1400.
      if (!gradYear || gradYear >= 2028) return ['MATH 1300'];
      return ['MATH 1400'];
    },
    note: (gradYear) => {
      if (!gradYear || gradYear >= 2028) {
        return 'Class of 2028+: Grants MATH 1300 (1 CU) and a MATH 1400 prerequisite waiver. (Penn restricted BC credit in 2024.)';
      }
      return 'Class of 2027 or earlier: Grants MATH 1400 (1 CU).';
    } },
  { id: 'ap-phys-c-mech', label: 'AP Physics C: Mechanics (5)', grants: ['PHYS 0150'],   note: 'Grants 1.5 CU for PHYS 0150.' },
  { id: 'ap-phys-c-em',   label: 'AP Physics C: E&M (5)',     grants: ['PHYS 0151'],     note: 'Grants 1.5 CU for PHYS 0151.' },
  { id: 'ap-chem',        label: 'AP Chemistry (5)',          grants: ['EAS_0091'],      note: 'Grants EAS 0091. NOT accepted by CHEM or CBE majors.' },
  { id: 'chem-placement', label: 'Penn CHEM Placement Exam',  grants: ['CHEM 1012', 'CHEM 1022'], note: 'Required for CHEM/CBE majors with prior knowledge.' },
  { id: 'chem-lab-waiver', label: 'CHEM 1101 / 1102 Lab Waiver', grants: ['CHEM 1101', 'CHEM 1102'], note: 'Case-by-case.' },
  { id: 'ap-cs-a',        label: 'AP Computer Science A (5)', grants: ['CIS 1100'],      note: 'Waives CIS 1100 for CIS majors.' },
  { id: 'ap-stat',        label: 'AP Statistics (5)',         grants: ['STAT_WAIVER'],   note: 'Waiver only.' },
  { id: 'lang-fluency',   label: 'Language fluency / AP Lang (5)', grants: ['LANG_FL'],  note: 'Satisfies Foreign Language FA.' },
];

// Helper: resolve an AP credit entry's `grants` and `note` for a given graduating year.
export function resolveAPCredit(entry: ApCredit, gradYear?: number | null): ResolvedApCredit {
  return {
    id: entry.id,
    label: entry.label,
    grants: typeof entry.grants === 'function' ? entry.grants(gradYear) : entry.grants,
    note:   typeof entry.note   === 'function' ? entry.note(gradYear)   : entry.note,
  };
}
