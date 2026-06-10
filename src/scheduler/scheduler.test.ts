// Scheduler regression — non-negotiable (CLAUDE.md "Testing requirements").
//
// For EVERY supported SAS major × SEAS major × concentration combination
// (enumerated from MAJORS data, not hardcoded), buildPlan must produce a
// plan whose summary has:
//   • meetsDualMin === true
//   • meetsEnergyReq === true
//   • unfulfilledFA.length === 0
//   • unfulfilledSec.length === 0
//
// Build options mirror the old App's seed call (references/old-app/index.html
// ~4806-4884): CHEM/CBE-style defaults generalized over every combo —
// apCreditIds ['ap-calc-bc'], gradYear 2028, legacy curriculum, shiftForward,
// frontloaded gen-eds, 12+5+3 distribution targets, no overrides/custom
// placements/deletions. viperMods mirrors the App's NCC-absent fallback ({});
// in legacy mode mods are inert either way.

import { describe, expect, it } from 'vitest';
import { MAJORS } from '../data/majors';
import { buildPlan } from './build-plan';

interface Combo {
  sasMajorKey: string;
  sasConcKey: string;
  seasMajorKey: string;
  seasConcKey: string;
}

const sasEntries = Object.entries(MAJORS).filter(([, m]) => m.school === 'SAS');
const seasEntries = Object.entries(MAJORS).filter(([, m]) => m.school === 'SEAS');

const combos: Combo[] = [];
for (const [sasMajorKey, sas] of sasEntries) {
  for (const sasConcKey of Object.keys(sas.concentrations)) {
    for (const [seasMajorKey, seas] of seasEntries) {
      for (const seasConcKey of Object.keys(seas.concentrations)) {
        combos.push({ sasMajorKey, sasConcKey, seasMajorKey, seasConcKey });
      }
    }
  }
}

// Default build options matching the old App component's seed (see header).
const DEFAULT_BUILD_OPTIONS = {
  apCreditIds: ['ap-calc-bc'],
  electiveOverrides: {},
  customPlacements: {},
  deletedCourses: [],
  curriculumMode: 'legacy',
  viperMods: {},
  shiftForward: true,
  genedDistribution: 'frontload',
  distributionTargets: { N: 12, SS: 5, H: 3 },
  gradYear: 2028,
} as const;

describe(`scheduler regression — ${combos.length} major × concentration combinations`, () => {
  it('enumerates a full combination matrix from MAJORS data', () => {
    expect(sasEntries.length).toBeGreaterThan(0);
    expect(seasEntries.length).toBeGreaterThan(0);
    expect(combos.length).toBe(
      sasEntries.reduce((a, [, m]) => a + Object.keys(m.concentrations).length, 0) *
        seasEntries.reduce((a, [, m]) => a + Object.keys(m.concentrations).length, 0),
    );
  });

  it.each(combos)(
    '$sasMajorKey/$sasConcKey + $seasMajorKey/$seasConcKey builds a valid plan',
    ({ sasMajorKey, sasConcKey, seasMajorKey, seasConcKey }) => {
      const plan = buildPlan({
        sasMajorKey,
        sasConcKey,
        seasMajorKey,
        seasConcKey,
        ...DEFAULT_BUILD_OPTIONS,
      });

      expect(plan).not.toBeNull();
      const summary = plan?.summary;
      expect(summary).toBeDefined();
      if (!summary) return; // narrowed above; keeps TS happy

      expect(summary.meetsDualMin).toBe(true);
      expect(summary.meetsEnergyReq).toBe(true);
      expect(summary.unfulfilledFA).toEqual([]);
      expect(summary.unfulfilledSec).toEqual([]);
    },
  );
});
