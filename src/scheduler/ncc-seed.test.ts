// NCC-mode seed regression — the counterpart of scheduler.test.ts for the
// curriculum VIPER '28+ is actually audited against. For EVERY supported
// major × concentration combination, an NCC seed built under CONFIRMED
// policy (only VIPR 1200/1210 → First-Year Seminar) must:
//   • meet the dual-degree CU minimum and the 3-energy-course rule
//   • place every non-waived Foundation (no 'Foundation' errors)
//   • leave no SS / H distribution shortfall
//   • never exceed the 5.5 CU first-semester cap
import { describe, expect, it } from 'vitest';
import { MAJORS } from '../data/majors';
import { CONFIRMED_VIPER_MODS } from '../ncc/mods';
import { installNccModule, type NccCheck } from '../ncc/scheduler-module';
import { buildPlan } from './build-plan';
import type { ViperMods as SchedulerViperMods } from './types';
import { FIRST_SEMESTER_CAP } from './helpers';

installNccModule();

const combos: Array<{ sas: string; sasC: string; seas: string; seasC: string }> = [];
for (const [sas, m] of Object.entries(MAJORS).filter(([, m]) => m.school === 'SAS')) {
  for (const sasC of Object.keys(m.concentrations)) {
    for (const [seas, e] of Object.entries(MAJORS).filter(([, m]) => m.school === 'SEAS')) {
      for (const seasC of Object.keys(e.concentrations)) combos.push({ sas, sasC, seas, seasC });
    }
  }
}

describe(`NCC seed regression — ${combos.length} combinations, confirmed policy`, () => {
  it.each(combos)('$sas/$sasC + $seas/$seasC', ({ sas, sasC, seas, seasC }) => {
    const plan = buildPlan({
      sasMajorKey: sas,
      sasConcKey: sasC,
      seasMajorKey: seas,
      seasConcKey: seasC,
      apCreditIds: ['ap-calc-bc'],
      gradYear: 2028,
      curriculumMode: 'ncc',
      viperMods: { ...CONFIRMED_VIPER_MODS } as SchedulerViperMods,
      shiftForward: true,
      genedDistribution: 'frontload',
      distributionTargets: { N: 12, SS: 5, H: 3 },
    });
    expect(plan).not.toBeNull();
    if (!plan?.summary) return;

    expect(plan.summary.meetsDualMin, 'dual-degree minimum').toBe(true);
    expect(plan.summary.meetsEnergyReq, 'three energy courses').toBe(true);

    const ncc = plan.summary.ncc;
    expect(ncc, 'NCC summary present in ncc mode').not.toBeNull();
    const checks = (ncc?.checks ?? []) as NccCheck[];
    const foundationErrors = checks.filter((c) => c.source === 'Foundation');
    expect(foundationErrors.map((c) => c.msg), 'every Foundation placed').toEqual([]);
    const distShort = checks.filter((c) => c.source === 'Distribution' && !/Natural Sciences/.test(c.msg));
    expect(distShort.map((c) => c.msg), 'no SS/H shortfall').toEqual([]);
    // Load ceilings are reported, not asserted: under confirmed policy the
    // NCC adds ~12 CU of non-major work, and whether that fits without
    // overload is the policy question the sandbox exists to argue.

    const fall = plan.semesters['fall-y1'] ?? [];
    const load = fall.reduce((s, c) => s + c.cu, 0);
    expect(load, `Fall Y1: ${fall.map((c) => `${c.code} (${c.cu})`).join(', ')}`).toBeLessThanOrEqual(
      FIRST_SEMESTER_CAP,
    );
  });
});
