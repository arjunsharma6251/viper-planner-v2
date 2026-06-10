// buildPlan orchestrator — ported verbatim from
// references/old-app/index.html (~2663-2745). The stage order is the
// algorithm; do not reorder.

import { MAJORS } from '../data/majors';
import { emptyPlan, getNccModule, resolveConcentration } from './helpers';
import { applyCredits } from './stages/apply-credits';
import { placeVIPER } from './stages/place-viper';
import { injectThermoIfNeeded } from './stages/inject-thermo-if-needed';
import { collectCoreCourses } from './stages/collect-core-courses';
import { placeCoreCourses } from './stages/place-core-courses';
import { computeFulfillment } from './stages/compute-fulfillment';
import { placeGenEd } from './stages/place-gen-ed';
import { backfillSectorVI } from './stages/backfill-sector-vi';
import { placeElectives } from './stages/place-electives';
import { ensureEnergyMinimum } from './stages/ensure-energy-minimum';
import { fillToMinimumCU } from './stages/fill-to-minimum-cu';
import { computeSummary } from './stages/compute-summary';
import { sortSemesters } from './stages/sort-semesters';
import type { BuildPlanOptions, SchedulerPlan } from './types';

/**
 * Build a complete plan.
 *
 * @param opts — see BuildPlanOptions (sasMajorKey e.g. 'PHYS', sasConcKey
 *   e.g. 'PTET' (optional), seasMajorKey e.g. 'MSE', seasConcKey e.g.
 *   'ENERGY' (optional), apCreditIds, electiveOverrides { slotId: courseCode })
 * @returns the built plan, or null for unknown / wrong-school major keys
 */
export function buildPlan(opts: BuildPlanOptions): SchedulerPlan | null {
  const {
    sasMajorKey,
    seasMajorKey,
    apCreditIds = [],
    electiveOverrides = {},
    customPlacements = {},
    deletedCourses = [], // course codes / slotIds explicitly removed by user
    curriculumMode = 'legacy', // 'legacy' | 'ncc'
    viperMods, // NCC mode: granular modification flags object
    viperModsEnabled, // BACKWARD COMPAT: legacy boolean
    shiftForward = true, // Shift courses earlier when AP credits free up space
    distributionTargets = { N: 12, SS: 5, H: 3 }, // NCC: 12+5+3 assignment
    genedDistribution = 'frontload', // 'frontload' (VIPER default) | 'penn' (back-loaded, single-degree style)
    gradYear, // Used for graduating-class-dependent credit policies (e.g. AP Calc BC)
  } = opts;
  const sasMajor = MAJORS[sasMajorKey];
  const seasMajor = MAJORS[seasMajorKey];
  if (!sasMajor || sasMajor.school !== 'SAS') return null;
  if (!seasMajor || seasMajor.school !== 'SEAS') return null;

  // Normalize mods: prefer viperMods object, fall back to legacy boolean
  const mods =
    getNccModule()?.normalizeViperMods(
      viperMods !== undefined
        ? viperMods
        : viperModsEnabled !== undefined
          ? viperModsEnabled
          : true, // default = current proposal (all-on)
    ) || null;

  // Resolve concentrations
  const sasConc = resolveConcentration(sasMajor, opts.sasConcKey);
  const seasConc = resolveConcentration(seasMajor, opts.seasConcKey);

  let plan = emptyPlan({
    sasMajor,
    seasMajor,
    sasConc,
    seasConc,
    sasMajorKey,
    seasMajorKey,
    sasConcKey: sasConc._key,
    seasConcKey: seasConc._key,
    overrides: electiveOverrides,
    customPlacements,
    deletedCourses: new Set(deletedCourses),
    curriculumMode,
    viperMods: mods, // object (may be null if NCC module not loaded)
    viperModsEnabled: mods && Object.values(mods).some((v) => v), // legacy summary flag
    shiftForward,
    genedDistribution,
    distributionTargets,
  });

  plan = applyCredits(plan, apCreditIds, { sasMajorKey, seasMajorKey, gradYear });
  plan = placeVIPER(plan);
  plan = injectThermoIfNeeded(plan, { sasMajorKey, seasMajorKey });
  plan = collectCoreCourses(plan, { sasMajor, seasMajor, sasConc, seasConc });
  plan = placeCoreCourses(plan);
  plan = computeFulfillment(plan, { sasMajor });
  plan = placeGenEd(plan);
  plan = backfillSectorVI(plan, { sasMajor, seasMajor });
  plan = placeElectives(plan, { sasConc, seasConc, overrides: electiveOverrides });
  plan = computeFulfillment(plan, { sasMajor }); // recompute after gen-ed + electives
  plan = ensureEnergyMinimum(plan);
  plan = fillToMinimumCU(plan);
  plan = computeSummary(plan, { sasMajor, seasMajor });
  plan = sortSemesters(plan);

  // Attach notes from major definitions
  for (const n of sasMajor.notes || []) {
    plan.notes.push({ level: 'info', src: sasMajorKey, text: n });
  }
  for (const n of seasMajor.notes || []) {
    plan.notes.push({ level: 'info', src: seasMajorKey, text: n });
  }

  return plan;
}
