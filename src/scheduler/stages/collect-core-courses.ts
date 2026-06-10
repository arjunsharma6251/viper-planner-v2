// STAGE 4 — ported verbatim from references/old-app/index.html (~1704-1739).

import type { Major } from '../../data/types';
import type { CoreCode, ResolvedConcentration, SchedulerPlan } from '../types';

export interface CollectCoreCoursesContext {
  sasMajor: Major;
  seasMajor: Major;
  sasConc: ResolvedConcentration;
  seasConc: ResolvedConcentration;
}

/**
 * STAGE 4: Compute the merged core course list across both majors.
 * Courses shared by both majors appear once and are marked as double-counts.
 */
export function collectCoreCourses(
  plan: SchedulerPlan,
  { sasMajor, seasMajor, sasConc, seasConc }: CollectCoreCoursesContext,
): SchedulerPlan {
  const sasCodes = [...sasMajor.sharedCore, ...(sasConc.extraCore || [])];
  const seasCodes = [...seasMajor.sharedCore, ...(seasConc.extraCore || [])];
  // Inject thermo for MATH+CIS
  if (
    plan.meta.requiredThermo &&
    !sasCodes.includes(plan.meta.requiredThermo) &&
    !seasCodes.includes(plan.meta.requiredThermo)
  ) {
    sasCodes.push(plan.meta.requiredThermo);
  }

  const seen = new Map<string, CoreCode>();
  const doubleCounted = new Set<string>();
  for (const code of sasCodes) {
    seen.set(code, { code, sas: true, seas: false });
  }
  for (const code of seasCodes) {
    if (seen.has(code)) {
      seen.get(code)!.seas = true;
      doubleCounted.add(code);
    } else {
      seen.set(code, { code, sas: false, seas: true });
    }
  }

  plan.meta.coreCodes = Array.from(seen.values());
  plan.meta.doubleCounted = doubleCounted;
  return plan;
}
