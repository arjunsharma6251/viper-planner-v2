// A core course never seeds earlier than its major's sample-schedule term
// unless incoming credit sits on its prerequisite chain (2026-11 beta feedback:
// P-Chem seeded in Year 2, Senior Design in Year 3, 7 CU sophomore terms).

import { describe, expect, it } from 'vitest';
import { MAJORS } from '../data/majors';
import { REGULAR_SEMESTER_KEYS, canPlaceInSemester } from './helpers';
import { courseEntry } from '../data/courses';
import { buildPlan } from './build-plan';
import type { SemesterKey } from '../data/semesters';

const seed = (sas: string, sasConc: string, seas: string, seasConc: string, apCreditIds: string[] = []) =>
  buildPlan({
    sasMajorKey: sas, sasConcKey: sasConc, seasMajorKey: seas, seasConcKey: seasConc,
    apCreditIds, gradYear: 2028, shiftForward: true, genedDistribution: 'frontload',
    curriculumMode: 'legacy', viperMods: {}, distributionTargets: { N: 12, SS: 5, H: 3 },
  })!;

const termOf = (plan: ReturnType<typeof seed>, code: string): SemesterKey | undefined =>
  (Object.keys(plan.semesters) as SemesterKey[]).find((k) => plan.semesters[k].some((c) => c.code === code));

const idx = (k: SemesterKey | undefined) => (k ? REGULAR_SEMESTER_KEYS.indexOf(k) : -1);

describe('sample-schedule floor (no incoming credit)', () => {
  it('CHEM/STANDARD + CBE/ENERGY keeps P-Chem in Year 3', () => {
    const plan = seed('CHEM', 'STANDARD', 'CBE', 'ENERGY');
    expect(termOf(plan, 'CHEM 2210')).toBe('fall-y3');
    for (const code of ['CHEM 2220', 'CHEM 2230', 'CHEM 2510']) expect(termOf(plan, code)).toBe('spring-y3');
    expect(plan.loads['spring-y2']).toBeLessThanOrEqual(6.5);
  });

  it('PHYS/NONE + ESE/NONE keeps Senior Design in Year 4', () => {
    const plan = seed('PHYS', 'NONE', 'ESE', 'NONE');
    expect(termOf(plan, 'ESE 4500')).toBe('fall-y4');
    expect(termOf(plan, 'ESE 4510')).toBe('spring-y4');
  });

  it('never seeds an elective in Fall Y1', () => {
    const plan = seed('CHEM', 'STANDARD', 'CBE', 'ENERGY');
    expect(plan.semesters['fall-y1'].filter((c) => c.isElective)).toEqual([]);
  });

  // Sample terms the catalog says the course is not offered in cannot be
  // honored (known data conflicts, reported 2026-11: MATH 4100 is FALL-only
  // but MATH's schedule says spring-y3; PHYS 0150 is FALL-only but ESE's
  // schedule says spring-y1). The floor applies to every honorable sample term.
  it('holds for every combination: no core course before its earliest sample term', () => {
    const offenders: string[] = [];
    for (const [sasKey, sas] of Object.entries(MAJORS).filter(([, m]) => m.school === 'SAS'))
      for (const sasConc of Object.keys(sas.concentrations))
        for (const [seasKey, seas] of Object.entries(MAJORS).filter(([, m]) => m.school === 'SEAS'))
          for (const seasConc of Object.keys(seas.concentrations)) {
            const plan = seed(sasKey, sasConc, seasKey, seasConc);
            const pref = plan.meta.preferredSem ?? {};
            for (const [code, sem] of Object.entries(pref)) {
              if (!canPlaceInSemester(courseEntry(code), sem)) continue;
              const at = termOf(plan, code);
              if (at && idx(at) >= 0 && idx(at) < idx(sem)) offenders.push(`${sasKey}/${sasConc}+${seasKey}/${seasConc}: ${code} ${at} < ${sem}`);
            }
          }
    expect(offenders).toEqual([]);
  });
});

describe('incoming credit still frees the path', () => {
  it('AP Physics C: Mechanics lets PHYS 0151 seed ahead of its sample term', () => {
    const without = seed('CHEM', 'STANDARD', 'CBE', 'ENERGY');
    const withCredit = seed('CHEM', 'STANDARD', 'CBE', 'ENERGY', ['ap-phys-c-mech']);
    expect(termOf(without, 'PHYS 0151')).toBe('spring-y2');
    expect(idx(termOf(withCredit, 'PHYS 0151'))).toBeLessThan(idx('spring-y2'));
  });
});
