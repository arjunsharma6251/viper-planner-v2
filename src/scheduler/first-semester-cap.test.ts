// Penn caps first-semester students at 5.5 CU. The seed must respect that
// for every major combination: core courses beyond the cap defer to the
// earliest later term with room, and no gen-ed, elective, or filler may
// push Fall Y1 past it.
import { describe, expect, it } from 'vitest';
import { MAJORS } from '../data/majors';
import { buildPlan } from './build-plan';
import { FIRST_SEMESTER_CAP } from './helpers';

const combos: Array<{ sas: string; sasC: string; seas: string; seasC: string }> = [];
for (const [sas, m] of Object.entries(MAJORS).filter(([, m]) => m.school === 'SAS')) {
  for (const sasC of Object.keys(m.concentrations)) {
    for (const [seas, e] of Object.entries(MAJORS).filter(([, m]) => m.school === 'SEAS')) {
      for (const seasC of Object.keys(e.concentrations)) combos.push({ sas, sasC, seas, seasC });
    }
  }
}

describe('first-semester cap (Fall Y1 ≤ 5.5 CU)', () => {
  it.each(combos)('$sas/$sasC + $seas/$seasC', ({ sas, sasC, seas, seasC }) => {
    const plan = buildPlan({
      sasMajorKey: sas,
      sasConcKey: sasC,
      seasMajorKey: seas,
      seasConcKey: seasC,
      apCreditIds: [],
      gradYear: 2028,
      curriculumMode: 'legacy',
      shiftForward: true,
      genedDistribution: 'frontload',
      distributionTargets: { N: 12, SS: 5, H: 3 },
    });
    expect(plan).not.toBeNull();
    if (!plan) return;
    const fall = plan.semesters['fall-y1'] ?? [];
    const load = fall.reduce((s, c) => s + c.cu, 0);
    expect(
      load,
      `Fall Y1 is ${load} CU: ${fall.map((c) => `${c.code} (${c.cu})`).join(', ')}`,
    ).toBeLessThanOrEqual(FIRST_SEMESTER_CAP);
  });
});
